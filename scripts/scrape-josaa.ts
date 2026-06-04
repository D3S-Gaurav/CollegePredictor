/**
 * JoSAA Opening & Closing Rank Scraper — v5
 *
 * Root causes fixed:
 *   1. Playwright Chromium blocks josaa.admissions.nic.in → use channel:"chrome"
 *   2. jQuery Chosen hides native <select> → force visibility via CSS injection
 *   3. __doPostBack via page.evaluate() corrupts VIEWSTATE → use proper Playwright 
 *      selectOption + force:true, then wait for navigation
 *   4. Submit button uses ASP.NET validation → click with force:true
 *
 * Dropdown IDs (from debug):
 *   ctl00_ContentPlaceHolder1_ddlYear
 *   ctl00_ContentPlaceHolder1_ddlroundno
 *   ctl00_ContentPlaceHolder1_ddlInstype
 *   ctl00_ContentPlaceHolder1_ddlInstitute
 *   ctl00_ContentPlaceHolder1_ddlBranch
 *   ctl00_ContentPlaceHolder1_ddlSeatType
 *   ctl00_ContentPlaceHolder1_btnSubmit
 */

import { chromium, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

// ── Config ─────────────────────────────────────────────────────────────
const ARCHIVE_URL =
  "https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchieve.aspx";
const SCRAPE_YEARS = ["2024", "2025"];
const MAX_RETRIES = 3;
const POSTBACK_WAIT = 3000;

// ASP.NET control IDs (exact from page inspection)
const IDS = {
  year: "ctl00_ContentPlaceHolder1_ddlYear",
  round: "ctl00_ContentPlaceHolder1_ddlroundno",
  instType: "ctl00_ContentPlaceHolder1_ddlInstype",
  institute: "ctl00_ContentPlaceHolder1_ddlInstitute",
  branch: "ctl00_ContentPlaceHolder1_ddlBranch",
  seatType: "ctl00_ContentPlaceHolder1_ddlSeatType",
  submit: "ctl00_ContentPlaceHolder1_btnSubmit",
};

// ── Debug dirs ─────────────────────────────────────────────────────────
const DEBUG_DIR = path.resolve(__dirname, "..", "debug");
const HTML_DIR = path.join(DEBUG_DIR, "html");
const SS_DIR = path.join(DEBUG_DIR, "screenshots");
const OUTPUT_DIR = path.resolve(__dirname, "..");

for (const d of [DEBUG_DIR, HTML_DIR, SS_DIR]) fs.mkdirSync(d, { recursive: true });

// ── Stats ──────────────────────────────────────────────────────────────
const stats = {
  totalRows: 0,
  dupsRemoved: 0,
  failedPages: 0,
  yearsScraped: new Set<string>(),
  roundsScraped: new Set<string>(),
};

// ── Helpers ────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function snap(page: Page, label: string) {
  const s = label.replace(/[^a-z0-9_-]/gi, "_");
  try {
    fs.writeFileSync(path.join(HTML_DIR, `${Date.now()}_${s}.html`), await page.content());
    await page.screenshot({ path: path.join(SS_DIR, `${Date.now()}_${s}.png`), fullPage: true });
  } catch {}
}

/**
 * Destroy the Chosen plugin and force all native <select> elements visible.
 * Must be called after every page load / postback since the DOM re-renders.
 */
async function destroyChosen(page: Page) {
  await page.evaluate(() => {
    // Remove Chosen containers
    document.querySelectorAll(".chosen-container").forEach((el) => el.remove());
    // Force all native selects visible
    document.querySelectorAll("select").forEach((sel) => {
      (sel as HTMLElement).style.display = "block";
      (sel as HTMLElement).style.visibility = "visible";
      (sel as HTMLElement).style.opacity = "1";
      (sel as HTMLElement).style.position = "static";
      (sel as HTMLElement).style.width = "auto";
      (sel as HTMLElement).style.height = "auto";
    });
  });
}

/**
 * Read all options from a <select> via JavaScript (works even if hidden).
 */
async function getOptions(page: Page, selectId: string): Promise<{ value: string; text: string }[]> {
  return page.evaluate((id) => {
    const sel = document.getElementById(id) as HTMLSelectElement | null;
    if (!sel) return [];
    return Array.from(sel.options).map((o) => ({
      value: o.value,
      text: o.text.trim(),
    }));
  }, selectId);
}

/**
 * Select a value in a dropdown using Playwright's native selectOption (which
 * triggers the browser's built-in change event properly), then wait for
 * the ASP.NET postback to complete.
 */
async function selectDropdown(page: Page, selectId: string, value: string, label: string): Promise<boolean> {
  const opts = await getOptions(page, selectId);
  if (opts.length === 0) {
    console.log(`    ℹ️  [${selectId}] has 0 options, skipping`);
    return true; // Not an error — dropdown may not have options yet
  }

  const target = opts.find(
    (o) => o.value === value || o.text.toUpperCase() === value.toUpperCase()
  );
  if (!target) {
    console.error(`    ❌ "${value}" not found in [${selectId}]`);
    return false;
  }

  console.log(`    ✅ [${label}] → "${target.text}" (${target.value})`);

  // Destroy Chosen so the native <select> is visible and Playwright can interact
  await destroyChosen(page);

  const loc = page.locator(`#${selectId}`);

  // Use Promise.all to wait for the postback navigation triggered by selectOption
  await Promise.all([
    page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {}),
    loc.selectOption(target.value, { force: true }),
  ]);

  await sleep(POSTBACK_WAIT);
  return true;
}

// ── Row type ───────────────────────────────────────────────────────────
interface Row {
  counselling_type: string;
  year: number;
  round: number;
  institute_name: string;
  institute_type: string;
  branch_name: string;
  quota: string;
  category: string;
  gender: string;
  opening_rank: number;
  closing_rank: number;
}

function detectType(name: string): string {
  const u = name.toUpperCase();
  if (u.includes("INDIAN INSTITUTE OF TECHNOLOGY")) return "IIT";
  if (u.includes("NATIONAL INSTITUTE OF TECHNOLOGY") || u.startsWith("NIT ")) return "NIT";
  if (u.includes("INDIAN INSTITUTE OF INFORMATION TECHNOLOGY") || u.includes("IIIT")) return "IIIT";
  return "GFTI";
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 JoSAA Scraper v5\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    channel: "chrome",
  });

  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  });
  const page = await ctx.newPage();
  const data: Record<string, Row[]> = { "2024": [], "2025": [] };

  try {
    for (const year of SCRAPE_YEARS) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`📅 YEAR: ${year}`);
      console.log("=".repeat(60));

      // Navigate fresh
      console.log(`  Loading archive page...`);
      await page.goto(ARCHIVE_URL, { waitUntil: "networkidle", timeout: 60000 });
      await sleep(2000);

      const title = await page.title();
      if (title.includes("500") || title.includes("Error")) {
        console.error(`  ❌ Page failed: "${title}"`);
        stats.failedPages++;
        continue;
      }
      console.log(`  ✅ Page loaded: "${title}"`);

      // Select Year
      const yearOpts = await getOptions(page, IDS.year);
      console.log(`  Year options: ${yearOpts.map((o) => o.text).join(", ")}`);
      if (!(await selectDropdown(page, IDS.year, year, "Year"))) { stats.failedPages++; continue; }
      stats.yearsScraped.add(year);

      // Read Round options
      const roundOpts = await getOptions(page, IDS.round);
      const validRounds = roundOpts.filter((o) => o.value && o.value !== "0" && o.text.trim() !== "" && o.text !== "--Select--");
      console.log(`  Rounds: ${validRounds.map((o) => o.text).join(", ")}`);

      for (const roundOpt of validRounds) {
        const roundNum = parseInt(roundOpt.text.replace(/\D/g, "")) || parseInt(roundOpt.value) || 1;
        console.log(`\n  🔄 Round ${roundNum} (val=${roundOpt.value})`);

        let success = false;
        for (let retry = 0; retry < MAX_RETRIES && !success; retry++) {
          try {
            // Clean navigation each time
            await page.goto(ARCHIVE_URL, { waitUntil: "networkidle", timeout: 60000 });
            await sleep(1500);

            // Year → triggers postback, populates rounds
            await selectDropdown(page, IDS.year, year, "Year");

            // Round → triggers postback, populates inst types
            await selectDropdown(page, IDS.round, roundOpt.value, "Round");

            // Institute Type → ALL
            const instTypeOpts = await getOptions(page, IDS.instType);
            console.log(`    InstType: ${instTypeOpts.map((o) => o.text).join(", ")}`);
            const allIT = instTypeOpts.find((o) => o.text.toUpperCase() === "ALL");
            if (allIT) await selectDropdown(page, IDS.instType, allIT.value, "InstType");

            // Institute → ALL
            const instOpts = await getOptions(page, IDS.institute);
            console.log(`    Institute: ${instOpts.length} options`);
            const allInst = instOpts.find((o) => o.text.toUpperCase() === "ALL");
            if (allInst) await selectDropdown(page, IDS.institute, allInst.value, "Institute");

            // Branch → ALL
            const branchOpts = await getOptions(page, IDS.branch);
            console.log(`    Branch: ${branchOpts.length} options`);
            const allBranch = branchOpts.find((o) => o.text.toUpperCase() === "ALL");
            if (allBranch) await selectDropdown(page, IDS.branch, allBranch.value, "Branch");

            // Seat Type → ALL
            const seatOpts = await getOptions(page, IDS.seatType);
            console.log(`    SeatType: ${seatOpts.map((o) => o.text).join(", ")}`);
            const allSeat = seatOpts.find((o) => o.text.toUpperCase() === "ALL");
            if (allSeat) await selectDropdown(page, IDS.seatType, allSeat.value, "SeatType");

            await snap(page, `before_submit_${year}_r${roundNum}`);

            // ── SUBMIT ─────────────────────────────────────────────
            console.log(`    🖱️  Clicking Submit...`);
            await destroyChosen(page);

            const submitBtn = page.locator(`#${IDS.submit}`);
            if ((await submitBtn.count()) === 0) {
              // Fallback
              const altBtn = page.locator('input[type="submit"]');
              if ((await altBtn.count()) > 0) {
                await Promise.all([
                  page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {}),
                  altBtn.click({ force: true }),
                ]);
              } else {
                throw new Error("No submit button found");
              }
            } else {
              await Promise.all([
                page.waitForLoadState("networkidle", { timeout: 120000 }).catch(() => {}),
                submitBtn.click({ force: true }),
              ]);
            }

            await sleep(5000); // Give extra time for large result set
            await snap(page, `after_submit_${year}_r${roundNum}`);

            // ── EXTRACT TABLE ──────────────────────────────────────
            const tableData = await page.evaluate(() => {
              // Find the data table - look for GridView or the table with most rows
              const tables = document.querySelectorAll("table");
              let bestTable: HTMLTableElement | null = null;
              let maxRows = 0;

              tables.forEach((t) => {
                const rows = t.querySelectorAll("tr");
                if (rows.length > maxRows) {
                  maxRows = rows.length;
                  bestTable = t;
                }
              });

              if (!bestTable || maxRows <= 1) {
                // Check page text for messages
                const bodyText = document.body.innerText;
                return {
                  headers: [] as string[],
                  rows: [] as string[][],
                  pageText: bodyText.substring(0, 500),
                  tableCount: tables.length,
                };
              }

              const allRows = bestTable.querySelectorAll("tr");
              const headers: string[] = [];
              const dataRows: string[][] = [];

              allRows[0].querySelectorAll("td, th").forEach((cell) => {
                headers.push((cell as HTMLElement).innerText.trim());
              });

              for (let i = 1; i < allRows.length; i++) {
                const cells: string[] = [];
                allRows[i].querySelectorAll("td").forEach((cell) => {
                  cells.push((cell as HTMLElement).innerText.trim());
                });
                if (cells.length >= 5) dataRows.push(cells);
              }

              return { headers, rows: dataRows, pageText: "", tableCount: tables.length };
            });

            console.log(`    📊 Tables on page: ${tableData.tableCount}`);
            console.log(`    📊 Headers: ${tableData.headers.join(" | ")}`);
            console.log(`    📊 Data rows: ${tableData.rows.length}`);

            if (tableData.rows.length === 0) {
              if (tableData.pageText) {
                console.log(`    📄 Page text: ${tableData.pageText.substring(0, 200)}`);
              }
              if (tableData.pageText?.includes("No Record") || tableData.pageText?.includes("No Data")) {
                console.log(`    ℹ️  No records for this combination`);
                success = true;
                continue;
              }
              throw new Error(`No data rows (${tableData.tableCount} tables found)`);
            }

            // Build column map
            const col: Record<string, number> = {};
            tableData.headers.forEach((h, i) => {
              const k = h.toLowerCase();
              if (k.includes("institute") && !("inst" in col)) col.inst = i;
              if ((k.includes("program") || k.includes("branch")) && !("branch" in col)) col.branch = i;
              if (k.includes("quota") && !("quota" in col)) col.quota = i;
              if ((k.includes("seat") || k.includes("category")) && !("cat" in col)) col.cat = i;
              if (k.includes("gender") && !("gender" in col)) col.gender = i;
              if (k.includes("opening") && !("open" in col)) col.open = i;
              if (k.includes("closing") && !("close" in col)) col.close = i;
            });
            console.log(`    🗺️  Columns: ${JSON.stringify(col)}`);

            if (tableData.rows.length > 0) {
              console.log(`    📝 Sample row: ${tableData.rows[0].join(" | ")}`);
            }

            let extracted = 0;
            for (const cells of tableData.rows) {
              const inst = (cells[col.inst ?? 0] ?? "").trim();
              const branch = (cells[col.branch ?? 1] ?? "").trim();
              const quota = (cells[col.quota ?? 2] ?? "").trim();
              const cat = (cells[col.cat ?? 3] ?? "").trim();
              const gender = (cells[col.gender ?? 4] ?? "").trim();
              const open = parseInt((cells[col.open ?? 5] ?? "").replace(/[^\d]/g, ""));
              const close = parseInt((cells[col.close ?? 6] ?? "").replace(/[^\d]/g, ""));

              if (!inst || isNaN(open) || isNaN(close)) continue;

              data[year].push({
                counselling_type: "JOSAA",
                year: parseInt(year),
                round: roundNum,
                institute_name: inst,
                institute_type: detectType(inst),
                branch_name: branch,
                quota,
                category: cat,
                gender,
                opening_rank: open,
                closing_rank: close,
              });
              extracted++;
              stats.totalRows++;
            }

            stats.roundsScraped.add(`${year}-R${roundNum}`);
            console.log(`    ✅ Extracted ${extracted} rows`);
            success = true;
          } catch (err) {
            console.error(`    ⚠️  Attempt ${retry + 1}/${MAX_RETRIES} failed: ${err}`);
            await snap(page, `error_${year}_r${roundNum}_try${retry}`);
            await sleep(3000 * (retry + 1));
          }
        }
        if (!success) stats.failedPages++;
      }
    }
  } catch (err) {
    console.error("💀 FATAL:", err);
    await snap(page, "fatal");
  } finally {
    await browser.close();
  }

  // ── Deduplicate & write CSV ──────────────────────────────────────────
  const dedupe = (rows: Row[]) => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      const k = `${r.year}|${r.round}|${r.institute_name}|${r.branch_name}|${r.quota}|${r.category}|${r.gender}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const u24 = dedupe(data["2024"]);
  const u25 = dedupe(data["2025"]);
  stats.dupsRemoved = stats.totalRows - u24.length - u25.length;

  const writeCsv = (f: string, rows: Row[]) => {
    if (!rows.length) { console.log(`  ⚠️  No data for ${f}`); return; }
    const hdr = Object.keys(rows[0]).join(",") + "\n";
    const body = rows
      .map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    fs.writeFileSync(path.join(OUTPUT_DIR, f), hdr + body);
    console.log(`  💾 ${f}: ${rows.length} rows`);
  };

  writeCsv("josaa_2024.csv", u24);
  writeCsv("josaa_2025.csv", u25);

  const sz = (f: string) => {
    const p = path.join(OUTPUT_DIR, f);
    return fs.existsSync(p) ? (fs.statSync(p).size / 1024).toFixed(1) : "0";
  };

  console.log("\n" + "=".repeat(60));
  console.log("📊 VALIDATION REPORT");
  console.log("=".repeat(60));
  console.log(`  rows_scraped       : ${stats.totalRows}`);
  console.log(`  duplicates_removed : ${stats.dupsRemoved}`);
  console.log(`  failed_pages       : ${stats.failedPages}`);
  console.log(`  years_scraped      : ${[...stats.yearsScraped].join(", ") || "none"}`);
  console.log(`  rounds_scraped     : ${[...stats.roundsScraped].join(", ") || "none"}`);
  console.log(`  josaa_2024.csv     : ${sz("josaa_2024.csv")} KB (${u24.length} rows)`);
  console.log(`  josaa_2025.csv     : ${sz("josaa_2025.csv")} KB (${u25.length} rows)`);
  console.log("=".repeat(60));
}

main().catch(console.error);
