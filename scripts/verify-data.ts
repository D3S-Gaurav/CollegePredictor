/**
 * Dataset verification.
 *
 * Prints an auditable summary of what is actually in the `cutoffs` table:
 * row counts, distinct institutes and branches, year/round coverage, and a
 * per-source breakdown. Run this after the importers and paste the emitted
 * markdown into the README's Data Provenance table, so every figure quoted
 * there is reproducible rather than asserted.
 *
 *   DATABASE_URL=... npm run verify:data
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

interface SourceRow {
  counselling_type: string;
  year: number;
  rows: bigint;
  institutes: bigint;
  branches: bigint;
  rounds: bigint;
}

function fmt(n: number | bigint): string {
  return Number(n).toLocaleString('en-IN');
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to .env first.');
    process.exit(1);
  }

  const [total, institutes, branches, states, instituteTypes] = await Promise.all([
    prisma.cutoff.count(),
    prisma.cutoff.findMany({ distinct: ['instituteName'], select: { instituteName: true } }),
    prisma.cutoff.findMany({ distinct: ['branchName'], select: { branchName: true } }),
    prisma.cutoff.findMany({ distinct: ['state'], select: { state: true } }),
    prisma.cutoff.groupBy({ by: ['instituteType'], _count: { _all: true } }),
  ]);

  if (total === 0) {
    console.error('The cutoffs table is empty — run the importers before verifying.');
    process.exit(1);
  }

  const rankAggregate = await prisma.cutoff.aggregate({
    _min: { closingRank: true },
    _max: { closingRank: true },
  });

  const bySource = await prisma.$queryRaw<SourceRow[]>`
    SELECT counselling_type,
           year,
           COUNT(*)                       AS rows,
           COUNT(DISTINCT institute_name)  AS institutes,
           COUNT(DISTINCT branch_name)     AS branches,
           COUNT(DISTINCT round)           AS rounds
    FROM cutoffs
    GROUP BY counselling_type, year
    ORDER BY counselling_type, year
  `;

  console.log('\n=== Dataset Summary ===\n');
  console.log(`Total cutoff rows      : ${fmt(total)}`);
  console.log(`Distinct institutes    : ${fmt(institutes.length)}`);
  console.log(`Distinct branches      : ${fmt(branches.length)}`);
  console.log(`States represented     : ${fmt(states.length)}`);
  console.log(
    `Closing rank range     : ${fmt(rankAggregate._min.closingRank ?? 0)} – ${fmt(rankAggregate._max.closingRank ?? 0)}`,
  );

  console.log('\nBy institute type:');
  for (const row of instituteTypes.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${row.instituteType.padEnd(6)} ${fmt(row._count._all).padStart(9)} rows`);
  }

  console.log('\n=== Markdown for README ===\n');
  console.log('| Source | Year | Rounds | Institutes | Branches | Rows |');
  console.log('| :--- | :---: | :---: | :---: | :---: | ---: |');
  for (const r of bySource) {
    console.log(
      `| ${r.counselling_type} | ${r.year} | ${fmt(r.rounds)} | ${fmt(r.institutes)} | ${fmt(r.branches)} | ${fmt(r.rows)} |`,
    );
  }
  console.log(
    `| **Total** | 2024–2025 | — | **${fmt(institutes.length)}** | **${fmt(branches.length)}** | **${fmt(total)}** |`,
  );
  console.log(`\nVerified on ${new Date().toISOString().slice(0, 10)}.\n`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
