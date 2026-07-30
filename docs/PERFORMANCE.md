# Query Performance

> **Status: not yet measured.**
> Every "Measured" cell below is empty on purpose. Fill them by running the
> commands in [Reproducing](#reproducing) against a populated database, and
> paste the real `EXPLAIN ANALYZE` output into the blocks provided. Nothing
> here should be quoted — in a README, a résumé, or anywhere else — until it
> reflects an actual run.

## Indexes

Eight indexes on `cutoffs`, declared in [`prisma/schema.prisma`](../prisma/schema.prisma).
Seven single-column indexes cover each independently filterable predicate; the
composite covers the shape `/api/predict` actually issues on every request.

| Index | Columns | Serves |
| :--- | :--- | :--- |
| `idx_counselling_type` | `counselling_type` | JoSAA / CSAB split |
| `idx_year` | `year` | Single-year queries (`year != "both"`) |
| `idx_round` | `round` | Round filter |
| `idx_category` | `category` | Category predicate — always present |
| `idx_gender` | `gender` | Gender predicate — always present |
| `idx_quota` | `quota` | HS/OS quota filter |
| `idx_closing_rank` | `closing_rank` | `closingRank >= rank` range scan and `ORDER BY` |
| `idx_composite_main` | `counselling_type, year, category, gender` | The four predicates present on every prediction request |

`idx_composite_main` exists because those four columns are non-optional in the
request schema, so a single composite is preferable to making the planner
intersect four separate bitmaps.

## Reproducing

```bash
# 1. Confirm the dataset is loaded and record its shape.
npm run verify:data

# 2. Capture the plan for the main prediction query.
psql "$DATABASE_URL" -f docs/explain-predict.sql
```

## Query 1 — main eligibility scan

The primary query behind `POST /api/predict`.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM cutoffs
WHERE counselling_type = 'JOSAA'
  AND category = 'OPEN'
  AND gender = 'Gender-Neutral'
  AND year = 2025
  AND closing_rank >= 12000
ORDER BY closing_rank ASC
LIMIT 100;
```

```
-- paste EXPLAIN (ANALYZE, BUFFERS) output here
```

| Metric | Measured |
| :--- | :--- |
| Planning time | — |
| Execution time | — |
| Index used | — |
| Rows returned / examined | — |

## Query 2 — batched cross-year lookup

The single query that replaces per-row confidence lookups. `N` is the number of
distinct `(institute, branch, quota)` tuples on the current page.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT institute_name, branch_name, quota, closing_rank
FROM cutoffs
WHERE counselling_type = 'JOSAA'
  AND category = 'OPEN'
  AND gender = 'Gender-Neutral'
  AND (institute_name, branch_name, quota) IN (
    -- ... N tuples from the page
  );
```

```
-- paste EXPLAIN (ANALYZE, BUFFERS) output here
```

| Metric | Measured |
| :--- | :--- |
| Tuples in `OR` clause (N) | — |
| Planning time | — |
| Execution time | — |
| Queries issued | 1 (by construction) |

## End-to-end latency

Measure the route, not just the SQL — serialisation and in-memory scoring are
part of the response time.

| Percentile | `/api/predict` |
| :--- | :--- |
| p50 | — |
| p95 | — |
| p99 | — |

Conditions to record alongside the numbers: row count in `cutoffs`, Postgres
version and host (local vs managed), `pageSize`, and whether the run was warm.

## Notes for future work

- **Pagination interacts with post-filtering.** The route fetches `pageSize * 2`
  rows and then drops some in memory (HS/OS quota resolution and the confidence
  filter), while `totalCount` is the *pre-filter* `COUNT(*)`. So `totalPages`
  can overstate, and a page can return fewer than `pageSize` rows even when
  more matches exist. Fixing this properly means either pushing the quota and
  confidence logic into SQL, or moving to keyset pagination on `closing_rank`.
- **`branchName: { contains: … }`** is a case-insensitive substring match and
  cannot use a B-tree index. If branch filtering becomes hot, a `pg_trgm` GIN
  index on `branch_name` is the fix.
