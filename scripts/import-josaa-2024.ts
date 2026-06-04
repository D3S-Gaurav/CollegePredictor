/**
 * Import JoSAA 2024 cutoff data.
 * Usage: npx tsx scripts/import-josaa-2024.ts path/to/josaa-2024.csv
 */
import { importData } from "./import-data";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/import-josaa-2024.ts <path-to-csv-or-xlsx>");
  process.exit(1);
}

importData(filePath, "JOSAA", 2024)
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌", err); process.exit(1); });
