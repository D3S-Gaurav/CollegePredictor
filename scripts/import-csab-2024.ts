/**
 * Import CSAB 2024 cutoff data.
 * Usage: npx tsx scripts/import-csab-2024.ts path/to/csab-2024.csv
 */
import { importData } from "./import-data";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/import-csab-2024.ts <path-to-csv-or-xlsx>");
  process.exit(1);
}

importData(filePath, "CSAB", 2024)
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌", err); process.exit(1); });
