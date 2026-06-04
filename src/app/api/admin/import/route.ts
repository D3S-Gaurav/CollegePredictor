import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

/** Column mapping: map CSV/XLSX headers to our schema */
const COLUMN_MAP: Record<string, string> = {
  "institute": "instituteName",
  "institute name": "instituteName",
  "academic program name": "branchName",
  "branch": "branchName",
  "branch name": "branchName",
  "program name": "branchName",
  "seat type": "category",
  "category": "category",
  "gender": "gender",
  "quota": "quota",
  "opening rank": "openingRank",
  "opening": "openingRank",
  "closing rank": "closingRank",
  "closing": "closingRank",
  "round": "round",
  "round no": "round",
  "round no.": "round",
  "year": "year",
  "institute type": "instituteType",
  "state": "state",
};

/**
 * POST /api/admin/import
 *
 * Accepts CSV or XLSX file upload, validates columns,
 * and imports cutoff data into the database.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const counsellingType = formData.get("counsellingType") as string;
    const yearOverride = formData.get("year") as string;

    if (!file || !counsellingType) {
      return NextResponse.json(
        { error: "File and counsellingType are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records: any[] = [];

    if (fileName.endsWith(".csv")) {
      const content = buffer.toString("utf-8");
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      return NextResponse.json(
        { error: "Only CSV and XLSX files are supported" },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // Map columns
    const headers = Object.keys(records[0]);
    const columnMapping: Record<string, string> = {};

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      if (COLUMN_MAP[normalizedHeader]) {
        columnMapping[header] = COLUMN_MAP[normalizedHeader];
      }
    }

    // Validate required columns
    const mappedFields = new Set(Object.values(columnMapping));
    const requiredFields = [
      "instituteName",
      "branchName",
      "category",
      "gender",
      "openingRank",
      "closingRank",
    ];

    const missingFields = requiredFields.filter((f) => !mappedFields.has(f));
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingFields.join(", ")}`,
          availableColumns: headers,
          columnMapping,
        },
        { status: 400 }
      );
    }

    // Transform and validate records
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataToInsert: any[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: any = {};

        for (const [origHeader, schemaField] of Object.entries(columnMapping)) {
          mapped[schemaField] = record[origHeader];
        }

        const openingRank = parseInt(String(mapped.openingRank));
        const closingRank = parseInt(String(mapped.closingRank));

        if (isNaN(openingRank) || isNaN(closingRank)) {
          skipped++;
          if (errors.length < 10) {
            errors.push(`Row ${i + 2}: Invalid rank values`);
          }
          continue;
        }

        // Detect institute type from name
        let instituteType = mapped.instituteType || "GFTI";
        const instName = (mapped.instituteName || "").toUpperCase();
        if (
          instName.includes("NATIONAL INSTITUTE OF TECHNOLOGY") ||
          instName.includes("NIT ")
        ) {
          instituteType = "NIT";
        } else if (
          instName.includes("INDIAN INSTITUTE OF INFORMATION TECHNOLOGY") ||
          instName.includes("IIIT")
        ) {
          instituteType = "IIIT";
        }

        // Detect state from institute name (heuristic)
        let state = mapped.state || "";
        if (!state) {
          // Try to extract state from institute name
          const stateMatch = (mapped.instituteName || "").match(
            /,\s*([A-Za-z\s]+)$/
          );
          if (stateMatch) {
            state = stateMatch[1].trim();
          }
        }

        dataToInsert.push({
          counsellingType,
          year: yearOverride
            ? parseInt(yearOverride)
            : mapped.year
            ? parseInt(String(mapped.year))
            : 2024,
          round: mapped.round ? parseInt(String(mapped.round)) : 1,
          instituteName: mapped.instituteName || "",
          instituteType,
          branchName: mapped.branchName || "",
          quota: mapped.quota || "AI",
          category: mapped.category || "OPEN",
          gender: mapped.gender || "Gender-Neutral",
          openingRank,
          closingRank,
          state,
        });
      } catch (err) {
        skipped++;
        if (errors.length < 10) {
          errors.push(`Row ${i + 2}: ${(err as Error).message}`);
        }
      }
    }

    // Bulk insert
    if (dataToInsert.length > 0) {
      const result = await prisma.cutoff.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      });
      imported = result.count;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: records.length,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: `Import failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/import
 *
 * Returns import stats: record counts by counselling type and year.
 */
export async function GET() {
  try {
    const stats = await prisma.cutoff.groupBy({
      by: ["counsellingType", "year"],
      _count: { id: true },
    });

    const totalCount = await prisma.cutoff.count();

    return NextResponse.json({
      stats: stats.map((s) => ({
        counsellingType: s.counsellingType,
        year: s.year,
        count: s._count.id,
      })),
      totalCount,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ stats: [], totalCount: 0 }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/import
 *
 * Deletes cutoff records by counselling type and year.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { counsellingType, year } = await request.json();

    const result = await prisma.cutoff.deleteMany({
      where: {
        counsellingType,
        year: parseInt(year),
      },
    });

    return NextResponse.json({
      deleted: result.count,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
