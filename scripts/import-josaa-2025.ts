/**
 * Import JoSAA 2025 cutoff data.
 * Usage: npx tsx scripts/import-josaa-2025.ts path/to/josaa-2025.csv
 */
import { importData } from "./import-data";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx scripts/import-josaa-2025.ts <path-to-csv-or-xlsx>");
  process.exit(1);
}

importData(filePath, "JOSAA", 2025)
  .then(() => process.exit(0))
  .catch((err) => { console.error("❌", err); process.exit(1); });
