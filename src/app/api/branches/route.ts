import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/branches?counsellingType=JOSAA
 *
 * Returns distinct branch names for the given counselling type.
 * Used to populate branch preference selectors.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const counsellingType = searchParams.get("counsellingType") || "JOSAA";

    const branches = await prisma.cutoff.findMany({
      where: { counsellingType },
      select: { branchName: true },
      distinct: ["branchName"],
      orderBy: { branchName: "asc" },
    });

    return NextResponse.json(
      branches.map((b) => b.branchName)
    );
  } catch (error) {
    console.error("Branches fetch error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
