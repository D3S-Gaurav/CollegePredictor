import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateConfidence,
  calculateResultScore,
} from "@/lib/prediction-engine";
import type { PredictionResult, PredictionResponse } from "@/types";
import type { ConfidenceLevel } from "@/lib/constants";

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
    const {
      rank,
      category,
      gender,
      homeState,
      year,
      round,
      counsellingType,
      branchPreferences = [],
      branchGroup,
      instituteType = [],
      stateFilter,
      confidenceFilter = "all",
      page = 1,
      pageSize = 50,
    } = body;

    if (!rank || rank <= 0) {
      return NextResponse.json(
        { error: "Valid rank is required" },
        { status: 400 }
      );
    }

    // Build WHERE clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
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

    // Home state quota logic: if user's homeState matches institute state → HS, else → OS
    // This is handled post-query since it depends on each row's institute state
    // But we can optimize by not filtering quota here if homeState is set

    // Branch group filter
    if (branchPreferences.length > 0) {
      where.branchName = {
        in: branchPreferences,
      };
      // Also try partial matches via contains for flexibility
      where.OR = branchPreferences.map((bp: string) => ({
        branchName: { contains: bp, mode: "insensitive" },
      }));
      delete where.branchName;
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

      // Calculate confidence using cross-year data
      const crossYearCutoffs = await prisma.cutoff.findMany({
        where: {
          counsellingType,
          instituteName: cutoff.instituteName,
          branchName: cutoff.branchName,
          category,
          gender,
          quota: cutoff.quota,
        },
        select: { closingRank: true },
      });

      const closingRanks = crossYearCutoffs.map((c) => c.closingRank);
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
