/**
 * JoSAA URL Discovery Script
 * 
 * Navigates via the homepage "Archive" nav link to discover the real
 * archive page URL, then dumps every form element found.
 */
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const DEBUG_DIR = path.resolve(__dirname, "..", "debug");
fs.mkdirSync(path.join(DEBUG_DIR, "html"), { recursive: true });
fs.mkdirSync(path.join(DEBUG_DIR, "screenshots"), { recursive: true });

async function discover() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    extraHTTPHeaders: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });

  const page = await context.newPage();

  // Step 1: Load homepage
  console.log("Step 1: Loading JoSAA homepage...");
  await page.goto("https://josaa.admissions.nic.in", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  
  // Save full page HTML (body included, after JS renders)
  const homeHtml = await page.content();
  fs.writeFileSync(path.join(DEBUG_DIR, "html", "homepage_full.html"), homeHtml);
  await page.screenshot({
    path: path.join(DEBUG_DIR, "screenshots", "homepage_full.png"),
    fullPage: true,
  });

  // Step 2: Find all links that mention "archive" or "opening" or "closing" or "rank"
  console.log("\nStep 2: Searching for archive-related links...");
  const allLinks = await page.locator("a").all();
  console.log(`Total links on page: ${allLinks.length}`);

  for (const link of allLinks) {
    const href = await link.getAttribute("href");
    const text = (await link.innerText().catch(() => "")).trim();
    if (!href) continue;
    
    const combined = (text + " " + href).toLowerCase();
    if (
      combined.includes("archive") ||
      combined.includes("opening") ||
      combined.includes("closing") ||
      combined.includes("rank") ||
      combined.includes("seatmatrix") ||
      combined.includes("cutoff")
    ) {
      console.log(`  🔗 "${text}" → ${href}`);
    }
  }

  // Step 3: Also print ALL nav links
  console.log("\nStep 3: All navigation links:");
  const navLinks = await page.locator("nav a, .menu a, #menu a, .nav a, li a").all();
  for (const link of navLinks) {
    const href = await link.getAttribute("href");
    const text = (await link.innerText().catch(() => "")).trim();
    if (href && text) {
      console.log(`  📌 "${text}" → ${href}`);
    }
  }

  // Step 4: Try clicking "Archive" link if present
  console.log("\nStep 4: Looking for 'Archive' link to click...");
  const archiveLink = page.locator('a').filter({ hasText: /^Archive$/i }).first();
  
  if (await archiveLink.count() > 0) {
    const href = await archiveLink.getAttribute("href");
    console.log(`  Found Archive link: ${href}`);
    
    // Open in new tab to capture the URL
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      archiveLink.click({ modifiers: ["Control"] }), // Ctrl+click = new tab
    ]).catch(async () => {
      // If ctrl+click doesn't work, just click normally
      console.log("  Ctrl+click failed, trying normal click...");
      await archiveLink.click();
      return [page];
    });

    await newPage.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
    await newPage.waitForTimeout(3000);
    
    const archiveUrl = newPage.url();
    const archiveTitle = await newPage.title();
    console.log(`  📍 Archive URL: ${archiveUrl}`);
    console.log(`  📍 Archive Title: ${archiveTitle}`);
    
    // Save full HTML
    const archiveHtml = await newPage.content();
    fs.writeFileSync(
      path.join(DEBUG_DIR, "html", "archive_via_click.html"),
      archiveHtml
    );
    await newPage.screenshot({
      path: path.join(DEBUG_DIR, "screenshots", "archive_via_click.png"),
      fullPage: true,
    });

    // Step 5: Discover all form elements
    console.log("\nStep 5: Form elements on archive page:");
    
    const selects = await newPage.locator("select").all();
    console.log(`  <select> elements: ${selects.length}`);
    for (const sel of selects) {
      const id = await sel.getAttribute("id");
      const name = await sel.getAttribute("name");
      const optCount = await sel.locator("option").count();
      const firstOpts = [];
      for (let i = 0; i < Math.min(5, optCount); i++) {
        firstOpts.push(await sel.locator("option").nth(i).innerText());
      }
      console.log(
        `    #${id} name="${name}" (${optCount} opts): ${firstOpts.join(", ")}...`
      );
    }

    const inputs = await newPage.locator('input[type="submit"], button[type="submit"], input[type="button"]').all();
    console.log(`  Submit/button elements: ${inputs.length}`);
    for (const inp of inputs) {
      const id = await inp.getAttribute("id");
      const val = await inp.getAttribute("value");
      const type = await inp.getAttribute("type");
      console.log(`    #${id} type="${type}" value="${val}"`);
    }
    
    if (newPage !== page) await newPage.close();
  } else {
    console.log("  ⚠️  No 'Archive' link found. Trying direct archive URLs...");
    
    // Try multiple URL variants
    const urls = [
      "https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchive.aspx",
      "https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchieve.aspx",
      "https://josaa.admissions.nic.in/applicant/SeatMatrix/OpeningClosingRankArchive.aspx",
      "https://josaa.admissions.nic.in/applicant/seatmatrix/OpeningClosingRankArchieve.aspx",
    ];
    
    for (const url of urls) {
      console.log(`  Trying: ${url}`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
      const t = await page.title();
      console.log(`    Title: "${t}"`);
      if (!t.includes("500") && !t.includes("Error")) {
        console.log(`  ✅ This URL works!`);
        break;
      }
    }
  }

  await browser.close();
}

discover().catch(console.error);
