https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchieve.aspx
I have identified a JoSAA endpoint that returns opening and closing rank data.

Build a Node.js + TypeScript scraper.

Requirements:

1. Use Playwright.
2. Visit the JoSAA Opening and Closing Rank Archive page.
3. Automatically iterate through:

- Years: 2024, 2025
- All available rounds
- All institute types
- All institutes
- All academic programs
- All seat categories

4. For every result table found:

Extract:

- Year
- Round
- Institute Type
- Institute Name
- Academic Program
- Seat Type / Category
- Opening Rank
- Closing Rank

5. Normalize the data into:

{
year,
round,
institute_name,
institute_type,
branch_name,
category,
opening_rank,
closing_rank
}

6. Save data as:

josaa_2024.csv
josaa_2025.csv

7. Also support PostgreSQL insertion.

8. Implement retry logic.

9. Detect pagination if present.

10. Handle dynamic dropdown loading using Playwright waits.

11. Log failures and continue scraping.

12. Produce import statistics:

- total rows scraped
- duplicate rows
- failed pages

13. Never use mock data.

14. Generate complete runnable code.

Use Playwright rather than static requests because the page appears to be ASP.NET and likely relies on hidden form fields and dynamic postbacks.
Build a production-grade Playwright scraper for JoSAA Opening and Closing Rank archives.

Goal:

Extract ALL cutoff data for:

- JoSAA 2024
- JoSAA 2025

The target website is an ASP.NET WebForms application that uses VIEWSTATE and dynamic dropdowns.

Requirements:

Technology:

- Node.js
- TypeScript
- Playwright

====================================================
NAVIGATION

Open:

https://josaa.admissions.nic.in/applicant/seatmatrix/openingclosingrankarchive.aspx

====================================================
YEARS

Scrape:

2024

2025

====================================================
ROUNDS

For each year:

iterate through all available rounds

====================================================
SCRAPING STRATEGY

Use browser automation.

Do NOT manually construct POST requests.

Let Playwright interact with dropdowns.

Handle ASP.NET VIEWSTATE automatically.

====================================================
DATA EXTRACTION

Extract every table row.

For every row capture:

year

round

institute_name

academic_program

quota

seat_type

gender

opening_rank

closing_rank

====================================================
NORMALIZATION

Create fields:

counselling_type = JOSAA

year

round

institute_name

branch_name

quota

category

gender

opening_rank

closing_rank

====================================================
OUTPUT

Generate:

josaa_2024.csv

josaa_2025.csv

====================================================
DATABASE SUPPORT

Generate PostgreSQL import script.

Table:

cutoffs

Columns:

id

counselling_type

year

round

institute_name

branch_name

quota

category

gender

opening_rank

closing_rank

====================================================
RESILIENCE

Retry failed pages.

Handle timeouts.

Continue after errors.

Log failures.

====================================================
PERFORMANCE

Use parallel scraping where safe.

Avoid duplicate rows.

====================================================
VALIDATION

At completion show:

rows_scraped

duplicates_removed

years_scraped

rounds_scraped

csv_file_sizes

====================================================
BONUS

Generate one command:

npm run scrape-josaa

that downloads all JoSAA 2024 and 2025 cutoff data automatically.
