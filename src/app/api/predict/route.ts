import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateConfidence,
  calculateResultScore,
} from "@/lib/prediction-engine";
import type { PredictionResult, PredictionResponse } from "@/types";
import { z } from "zod";
import {
  CATEGORIES,
  GENDERS,
  COUNSELLING_TYPES,
  INSTITUTE_TYPES,
  type ConfidenceLevel,
} from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

/** Maximum page size to prevent DoS via unreasonably large queries */
const MAX_PAGE_SIZE = 200;

/**
 * Zod schema for prediction request validation.
 *
 * Why Zod: validates at the API boundary so Prisma never
 * receives malformed or unexpected filter values.
 */
const PredictRequestSchema = z.object({
  rank: z.number().int().positive("Rank must be a positive integer"),
  category: z.enum(CATEGORIES),
  gender: z.enum(GENDERS),
  homeState: z.string().optional().default(""),
  year: z.union([z.literal("2024"), z.literal("2025"), z.literal("both")]),
  round: z.string().default("all"),
  counsellingType: z.enum(COUNSELLING_TYPES),
  branchPreferences: z.array(z.string()).optional().default([]),
  branchGroup: z.string().optional().default(""),
  instituteType: z
    .array(z.enum(INSTITUTE_TYPES))
    .optional()
    .default([]),
  stateFilter: z.string().optional().default("all"),
  confidenceFilter: z
    .union([
      z.literal("SAFE"),
      z.literal("LIKELY"),
      z.literal("DREAM"),
      z.literal("REACH"),
      z.literal("all"),
    ])
    .optional()
    .default("all"),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().optional().default(50),
});

/**
 * POST /api/predict
 *
 * Server-side eligibility engine. Queries the database with all filters,
 * calculates confidence and scoring, and returns paginated results.
 *
 * Performance target: <200ms response time.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PredictRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      rank,
      category,
      gender,
      homeState,
      year,
      round,
      counsellingType,
      branchPreferences,
      instituteType,
      stateFilter,
      confidenceFilter,
      page,
    } = parsed.data;

    // Cap pageSize to prevent DoS
    const pageSize = Math.min(parsed.data.pageSize, MAX_PAGE_SIZE);

    // Build WHERE clause with proper Prisma types
    const where: Prisma.CutoffWhereInput = {
      counsellingType,
      category,
      gender,
      closingRank: { gte: rank }, // rank <= closing_rank means eligible
    };

    // Year filter
    if (year !== "both") {
      where.year = parseInt(year);
    }

    // Round filter
    if (round !== "all") {
      where.round = parseInt(round);
    }

    // Institute type filter
    if (instituteType.length > 0) {
      where.instituteType = { in: instituteType };
    }

    // State filter (institute state)
    if (stateFilter && stateFilter !== "all") {
      where.state = stateFilter;
    }

    // Branch filter: use OR with case-insensitive partial matching
    // (The previous `in` filter was dead code — it was set then deleted)
    if (branchPreferences.length > 0) {
      where.OR = branchPreferences.map((bp) => ({
        branchName: { contains: bp, mode: "insensitive" as const },
      }));
    }

    // Query database
    const [cutoffs, totalCount] = await Promise.all([
      prisma.cutoff.findMany({
        where,
        orderBy: [{ closingRank: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize * 2, // Fetch extra for post-filtering
      }),
      prisma.cutoff.count({ where }),
    ]);

    // ──────────────────────────────────────────────────────────
    // BATCHED confidence calculation (fixes N+1 query problem)
    //
    // Instead of 1 DB query per cutoff row, we:
    //  1. Collect unique (instituteName, branchName, quota) tuples
    //  2. Run ONE query with a WHERE ... OR clause
    //  3. Group results in-memory by composite key
    // ──────────────────────────────────────────────────────────

    // Build unique set of (instituteName, branchName, quota) combos
    type CompositeKey = `${string}|${string}|${string}`;
    const uniqueCombos = new Map<
      CompositeKey,
      { instituteName: string; branchName: string; quota: string }
    >();

    for (const cutoff of cutoffs) {
      const key: CompositeKey =
        `${cutoff.instituteName}|${cutoff.branchName}|${cutoff.quota}`;
      if (!uniqueCombos.has(key)) {
        uniqueCombos.set(key, {
          instituteName: cutoff.instituteName,
          branchName: cutoff.branchName,
          quota: cutoff.quota,
        });
      }
    }

    // Single batched query for cross-year confidence data
    let crossYearMap: Map<CompositeKey, number[]>;

    if (uniqueCombos.size > 0) {
      const orConditions = Array.from(uniqueCombos.values()).map((combo) => ({
        counsellingType,
        instituteName: combo.instituteName,
        branchName: combo.branchName,
        category,
        gender,
        quota: combo.quota,
      }));

      const crossYearCutoffs = await prisma.cutoff.findMany({
        where: { OR: orConditions },
        select: {
          instituteName: true,
          branchName: true,
          quota: true,
          closingRank: true,
        },
      });

      // Group closing ranks by composite key
      crossYearMap = new Map();
      for (const c of crossYearCutoffs) {
        const key: CompositeKey =
          `${c.instituteName}|${c.branchName}|${c.quota}`;
        const existing = crossYearMap.get(key);
        if (existing) {
          existing.push(c.closingRank);
        } else {
          crossYearMap.set(key, [c.closingRank]);
        }
      }
    } else {
      crossYearMap = new Map();
    }

    // Post-process: apply HS/OS quota logic and calculate confidence
    const results: PredictionResult[] = [];

    for (const cutoff of cutoffs) {
      // HS/OS quota logic
      if (homeState) {
        const isHomeState =
          cutoff.state.toLowerCase().includes(homeState.toLowerCase()) ||
          homeState.toLowerCase().includes(cutoff.state.toLowerCase());

        if (cutoff.quota === "HS" && !isHomeState) continue;
        if (cutoff.quota === "OS" && isHomeState) continue;
      }

      // Lookup pre-fetched confidence data (O(1) instead of DB hit)
      const key: CompositeKey =
        `${cutoff.instituteName}|${cutoff.branchName}|${cutoff.quota}`;
      const closingRanks = crossYearMap.get(key) ?? [];
      const confidence = calculateConfidence(rank, closingRanks);

      // Apply confidence filter
      if (confidenceFilter !== "all" && confidence !== confidenceFilter) {
        continue;
      }

      const score = calculateResultScore({
        instituteType: cutoff.instituteType,
        branchName: cutoff.branchName,
        confidence,
        branchPreferences,
        closingRank: cutoff.closingRank,
        userRank: rank,
      });

      results.push({
        id: cutoff.id,
        instituteName: cutoff.instituteName,
        instituteType: cutoff.instituteType,
        branchName: cutoff.branchName,
        state: cutoff.state,
        quota: cutoff.quota,
        category: cutoff.category,
        gender: cutoff.gender,
        openingRank: cutoff.openingRank,
        closingRank: cutoff.closingRank,
        year: cutoff.year,
        round: cutoff.round,
        confidence,
        score,
        counsellingType: cutoff.counsellingType,
      });

      if (results.length >= pageSize) break;
    }

    // Sort by composite score (descending)
    results.sort((a, b) => b.score - a.score);

    const response: PredictionResponse = {
      results,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
