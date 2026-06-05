import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "url"; // Just to appease any linting or ts-node issues if needed.

// Initialize Prisma client directly since we are in a standalone script
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is required.");
  console.error("   Copy .env.example to .env and set your connection string.");
  process.exit(1);
}
const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

const institutes = [
  { name: "National Institute of Technology Tiruchirappalli", type: "NIT", state: "Tamil Nadu" },
  { name: "National Institute of Technology Karnataka Surathkal", type: "NIT", state: "Karnataka" },
  { name: "National Institute of Technology Rourkela", type: "NIT", state: "Odisha" },
  { name: "National Institute of Technology Warangal", type: "NIT", state: "Telangana" },
  { name: "Motilal Nehru National Institute of Technology Allahabad", type: "NIT", state: "Uttar Pradesh" },
  { name: "Visvesvaraya National Institute of Technology Nagpur", type: "NIT", state: "Maharashtra" },
  { name: "Indian Institute of Information Technology Allahabad", type: "IIIT", state: "Uttar Pradesh" },
  { name: "Indian Institute of Information Technology Gwalior", type: "IIIT", state: "Madhya Pradesh" },
  { name: "Indian Institute of Information Technology Lucknow", type: "IIIT", state: "Uttar Pradesh" },
  { name: "Birla Institute of Technology, Mesra", type: "GFTI", state: "Jharkhand" },
  { name: "Punjab Engineering College, Chandigarh", type: "GFTI", state: "Chandigarh" },
];

const branches = [
  "Computer Science and Engineering",
  "Artificial Intelligence and Data Science",
  "Information Technology",
  "Electronics and Communication Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering"
];

const categories = ["OPEN", "EWS", "OBC-NCL", "SC", "ST"];
const quotas = ["HS", "OS", "AI"];
const genders = ["Gender-Neutral", "Female-only (Supernumerary)"];

async function main() {
  console.log("Generating dummy data...");
  const data = [];

  for (const year of [2024, 2025]) {
    for (const counsellingType of ["JOSAA", "CSAB"]) {
      const maxRounds = counsellingType === "JOSAA" ? 5 : 2;
      for (let round = 1; round <= maxRounds; round++) {
        for (const inst of institutes) {
          for (const branch of branches) {
            for (const category of categories) {
              for (const gender of genders) {
                // Determine valid quotas for the institute type
                let validQuotas = ["OS", "HS"];
                if (inst.type === "IIIT" || inst.type === "GFTI") {
                  validQuotas = ["AI"]; // Simplified for dummy data
                }

                for (const quota of validQuotas) {
                  // Generate somewhat realistic ranks
                  let baseRank = 1000;
                  if (branch === "Computer Science and Engineering") baseRank = 500;
                  else if (branch.includes("Artificial")) baseRank = 800;
                  else if (branch.includes("Electronics")) baseRank = 2000;
                  else if (branch.includes("Mechanical")) baseRank = 5000;
                  else if (branch.includes("Civil")) baseRank = 8000;

                  if (inst.type === "IIIT") baseRank *= 1.5;
                  if (inst.type === "GFTI") baseRank *= 3;

                  // Category multipliers
                  if (category === "OBC-NCL") baseRank *= 0.3; // Category ranks are smaller numbers usually, or use CRL (let's assume these are category ranks)
                  if (category === "SC") baseRank *= 0.1;
                  if (category === "ST") baseRank *= 0.05;

                  // Round inflation (later rounds have higher closing ranks)
                  baseRank += round * 200;

                  // Year variation
                  if (year === 2025) baseRank *= 1.05;

                  const openingRank = Math.max(1, Math.floor(baseRank * (0.5 + Math.random() * 0.4)));
                  const closingRank = Math.max(openingRank + 10, Math.floor(baseRank * (1 + Math.random() * 0.5)));

                  data.push({
                    counsellingType,
                    year,
                    round,
                    instituteName: inst.name,
                    instituteType: inst.type,
                    branchName: branch,
                    quota,
                    category,
                    gender,
                    openingRank,
                    closingRank,
                    state: inst.state,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  console.log(`Generated ${data.length} records. Inserting...`);
  
  // Insert in chunks to avoid overwhelming the DB
  const chunkSize = 5000;
  let inserted = 0;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await prisma.cutoff.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += chunk.length;
    console.log(`Inserted ${inserted} / ${data.length}...`);
  }

  console.log("Dummy data insertion complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
