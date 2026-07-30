/**
 * Shared import utility for JoSAA/CSAB cutoff data.
 *
 * Usage: npx tsx scripts/import-josaa-2024.ts path/to/data.csv
 *
 * Supports CSV and XLSX formats.
 */

import "dotenv/config";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

/* Reuse the configured singleton. Constructing `new PrismaClient()` here threw
   under Prisma 7, which requires an explicit driver adapter — so every importer
   failed at startup after the Prisma 7 upgrade. */
import { prisma } from "../src/lib/prisma";

/** Column header normalization map */
const HEADER_MAP: Record<string, string> = {
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

/** Detects institute type from its name */
function detectInstituteType(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes("NATIONAL INSTITUTE OF TECHNOLOGY") || upper.includes("NIT ")) return "NIT";
  if (upper.includes("INDIAN INSTITUTE OF INFORMATION TECHNOLOGY") || upper.includes("IIIT")) return "IIIT";
  return "GFTI";
}

/** Extracts state from institute name (heuristic) */
function extractState(name: string): string {
  const match = name.match(/,\s*([A-Za-z\s]+)$/);
  return match ? match[1].trim() : "";
}

export async function importData(
  filePath: string,
  counsellingType: "JOSAA" | "CSAB",
  year: number
) {
  console.log(`\n📂 Importing ${counsellingType} ${year} from: ${filePath}`);

  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let records: any[] = [];

  if (ext === ".csv") {
    records = parse(buffer.toString("utf-8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } else if (ext === ".xlsx" || ext === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  console.log(`📊 Found ${records.length} rows`);

  // Map columns
  const headers = Object.keys(records[0] || {});
  const columnMapping: Record<string, string> = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (HEADER_MAP[normalized]) {
      columnMapping[header] = HEADER_MAP[normalized];
    }
  }

  console.log(`🔗 Mapped columns:`, Object.entries(columnMapping).map(([k, v]) => `${k} → ${v}`).join(", "));

  // Transform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [];
  let skipped = 0;

  for (const record of records) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped: any = {};
    for (const [orig, schema] of Object.entries(columnMapping)) {
      mapped[schema] = record[orig];
    }

    const openingRank = parseInt(String(mapped.openingRank));
    const closingRank = parseInt(String(mapped.closingRank));

    if (isNaN(openingRank) || isNaN(closingRank)) {
      skipped++;
      continue;
    }

    const instituteName = mapped.instituteName || "";

    data.push({
      counsellingType,
      year,
      round: mapped.round ? parseInt(String(mapped.round)) : 1,
      instituteName,
      instituteType: mapped.instituteType || detectInstituteType(instituteName),
      branchName: mapped.branchName || "",
      quota: mapped.quota || "AI",
      category: mapped.category || "OPEN",
      gender: mapped.gender || "Gender-Neutral",
      openingRank,
      closingRank,
      state: mapped.state || extractState(instituteName),
    });
  }

  console.log(`✅ Validated ${data.length} rows (${skipped} skipped)`);

  // Bulk insert
  const result = await prisma.cutoff.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`💾 Inserted ${result.count} records into database`);
  console.log(`🎉 Import complete!\n`);

  return result.count;
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length >= 3) {
  const [file, type, yr] = args;
  importData(file, type as "JOSAA" | "CSAB", parseInt(yr))
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Import failed:", err);
      process.exit(1);
    });
}
