/**
 * Import scraped JoSAA CSV data into PostgreSQL.
 *
 * Usage: npx tsx scripts/import-josaa-scraped.ts
 *
 * Reads josaa_2024.csv and josaa_2025.csv from the project root,
 * clears old JoSAA data, and bulk-inserts the scraped records.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";

const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  "postgresql://collegeapp:collegeapp123@localhost:5432/college_predictor";

const CHUNK_SIZE = 2000;

/** Extract state from institute name heuristic */
function extractState(name: string): string {
  // Common patterns: "NIT Trichy, Tamil Nadu" or "NIT Rourkela"
  const stateMap: Record<string, string> = {
    "Bhubaneswar": "Odisha", "Bombay": "Maharashtra", "Delhi": "Delhi",
    "Guwahati": "Assam", "Hyderabad": "Telangana", "Indore": "Madhya Pradesh",
    "Jodhpur": "Rajasthan", "Kanpur": "Uttar Pradesh", "Kharagpur": "West Bengal",
    "Madras": "Tamil Nadu", "Mandi": "Himachal Pradesh", "Patna": "Bihar",
    "Roorkee": "Uttarakhand", "Ropar": "Punjab", "Varanasi": "Uttar Pradesh",
    "Dhanbad": "Jharkhand", "Goa": "Goa", "Tirupati": "Andhra Pradesh",
    "Palakkad": "Kerala", "Bhilai": "Chhattisgarh", "Dharwad": "Karnataka",
    "Jammu": "Jammu & Kashmir", "Raipur": "Chhattisgarh",
    "Rourkela": "Odisha", "Trichy": "Tamil Nadu", "Warangal": "Telangana",
    "Surathkal": "Karnataka", "Calicut": "Kerala", "Durgapur": "West Bengal",
    "Hamirpur": "Himachal Pradesh", "Jamshedpur": "Jharkhand",
    "Jaipur": "Rajasthan", "Kurukshetra": "Haryana", "Nagpur": "Maharashtra",
    "Silchar": "Assam", "Srinagar": "Jammu & Kashmir", "Surat": "Gujarat",
    "Agartala": "Tripura", "Arunachal Pradesh": "Arunachal Pradesh",
    "Manipur": "Manipur", "Meghalaya": "Meghalaya", "Mizoram": "Mizoram",
    "Nagaland": "Nagaland", "Sikkim": "Sikkim", "Allahabad": "Uttar Pradesh",
    "Prayagraj": "Uttar Pradesh", "Shibpur": "West Bengal",
    "Bangalore": "Karnataka", "Bengaluru": "Karnataka",
    "Chennai": "Tamil Nadu", "Pune": "Maharashtra", "Kolkata": "West Bengal",
    "Lucknow": "Uttar Pradesh", "Bhopal": "Madhya Pradesh",
    "Ranchi": "Jharkhand", "Kottayam": "Kerala", "Kurnool": "Andhra Pradesh",
    "Chittoor": "Andhra Pradesh", "Jabalpur": "Madhya Pradesh",
    "Gwalior": "Madhya Pradesh", "Sonepat": "Haryana",
  };

  for (const [city, state] of Object.entries(stateMap)) {
    if (name.includes(city)) return state;
  }
  return "";
}

async function main() {
  console.log("🚀 JoSAA Data Import\n");

  const adapter = new PrismaPg(CONNECTION_STRING);
  const prisma = new PrismaClient({ adapter });

  const files = [
    { path: path.resolve(__dirname, "..", "josaa_2024.csv"), year: 2024 },
    { path: path.resolve(__dirname, "..", "josaa_2025.csv"), year: 2025 },
  ];

  // Verify files exist
  for (const f of files) {
    if (!fs.existsSync(f.path)) {
      console.error(`❌ File not found: ${f.path}`);
      console.error("   Run 'npm run scrape-josaa' first to generate CSVs.");
      process.exit(1);
    }
  }

  // Clear old JoSAA data
  console.log("🗑️  Clearing existing JoSAA data...");
  const deleted = await prisma.cutoff.deleteMany({
    where: { counsellingType: "JOSAA" },
  });
  console.log(`   Removed ${deleted.count} old records\n`);

  let totalInserted = 0;

  for (const file of files) {
    console.log(`📂 Processing ${path.basename(file.path)} (${file.year})...`);

    const csv = fs.readFileSync(file.path, "utf-8");
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    console.log(`   📊 Parsed ${records.length} rows from CSV`);

    // Transform to Prisma format
    const data = records
      .map((r: Record<string, string>) => {
        const openingRank = parseInt(r.opening_rank);
        const closingRank = parseInt(r.closing_rank);
        if (isNaN(openingRank) || isNaN(closingRank)) return null;

        return {
          counsellingType: r.counselling_type || "JOSAA",
          year: parseInt(r.year) || file.year,
          round: parseInt(r.round) || 1,
          instituteName: r.institute_name || "",
          instituteType: r.institute_type || "",
          branchName: r.branch_name || "",
          quota: r.quota || "AI",
          category: r.category || "OPEN",
          gender: r.gender || "Gender-Neutral",
          openingRank,
          closingRank,
          state: extractState(r.institute_name || ""),
        };
      })
      .filter(Boolean);

    console.log(`   ✅ Validated ${data.length} records`);

    // Bulk insert in chunks
    let inserted = 0;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const result = await prisma.cutoff.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      inserted += result.count;
      process.stdout.write(`   💾 Inserted ${inserted}/${data.length}\r`);
    }
    console.log(`   💾 Inserted ${inserted}/${data.length} records`);
    totalInserted += inserted;
  }

  // Verify
  const totalCount = await prisma.cutoff.count({
    where: { counsellingType: "JOSAA" },
  });
  const yearCounts = await prisma.cutoff.groupBy({
    by: ["year"],
    where: { counsellingType: "JOSAA" },
    _count: true,
  });

  console.log("\n" + "=".repeat(50));
  console.log("📊 IMPORT COMPLETE");
  console.log("=".repeat(50));
  console.log(`  Total inserted : ${totalInserted}`);
  console.log(`  Total in DB    : ${totalCount}`);
  for (const yc of yearCounts) {
    console.log(`  Year ${yc.year}      : ${yc._count} records`);
  }
  console.log("=".repeat(50));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
