import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/analytics?branch=CSE&counsellingType=JOSAA&category=OPEN&gender=Gender-Neutral
 *
 * Returns trend data (opening/closing rank by year and round)
 * for a specific branch across institutes.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchQuery = searchParams.get("branch") || "";
    const counsellingType = searchParams.get("counsellingType") || "JOSAA";
    const category = searchParams.get("category") || "OPEN";
    const gender = searchParams.get("gender") || "Gender-Neutral";
    const instituteName = searchParams.get("institute") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      counsellingType,
      category,
      gender,
      branchName: { contains: branchQuery, mode: "insensitive" },
    };

    if (instituteName) {
      where.instituteName = { contains: instituteName, mode: "insensitive" };
    }

    const cutoffs = await prisma.cutoff.findMany({
      where,
      select: {
        year: true,
        round: true,
        closingRank: true,
        openingRank: true,
        instituteName: true,
      },
      orderBy: [{ year: "asc" }, { round: "asc" }],
    });

    // Aggregate: average closing/opening rank per year-round combo
    const aggregated = new Map<
      string,
      { year: number; round: number; closingRanks: number[]; openingRanks: number[] }
    >();

    for (const c of cutoffs) {
      const key = `${c.year}-R${c.round}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          year: c.year,
          round: c.round,
          closingRanks: [],
          openingRanks: [],
        });
      }
      const entry = aggregated.get(key)!;
      entry.closingRanks.push(c.closingRank);
      entry.openingRanks.push(c.openingRank);
    }

    const trends = Array.from(aggregated.values()).map((entry) => ({
      year: entry.year,
      round: entry.round,
      label: `${entry.year} R${entry.round}`,
      avgClosingRank: Math.round(
        entry.closingRanks.reduce((a, b) => a + b, 0) / entry.closingRanks.length
      ),
      avgOpeningRank: Math.round(
        entry.openingRanks.reduce((a, b) => a + b, 0) / entry.openingRanks.length
      ),
      minClosingRank: Math.min(...entry.closingRanks),
      maxClosingRank: Math.max(...entry.closingRanks),
    }));

    // Also get distinct institutes for the filter dropdown
    const institutes = await prisma.cutoff.findMany({
      where: {
        counsellingType,
        branchName: { contains: branchQuery, mode: "insensitive" },
      },
      select: { instituteName: true },
      distinct: ["instituteName"],
      orderBy: { instituteName: "asc" },
    });

    return NextResponse.json({
      trends,
      institutes: institutes.map((i) => i.instituteName),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ trends: [], institutes: [] }, { status: 500 });
  }
}
