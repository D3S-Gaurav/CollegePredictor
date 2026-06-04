/**
 * Import CSAB 2025 cutoff data.
 * Usage: npx tsx scripts/import-csab-2025.ts path/to/csab-2025.csv
 */
import { importData } from "./import-data";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/import-csab-2025.ts <path-to-csv-or-xlsx>");
  process.exit(1);
}

importData(filePath, "CSAB", 2025)
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌", err); process.exit(1); });
