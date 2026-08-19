/**
 * Captures the screenshots used in the README.
 *
 * Needs a Chromium browser on the machine and puppeteer-core installed ad hoc:
 *   npm install --no-save puppeteer-core
 *   npm run dev
 *   node scripts/screenshots.mjs
 */
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const URL = process.env.URL ?? 'http://localhost:5173';
const OUT = 'docs/screenshots';
const CHROME =
  process.env.CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await sleep(450);
}

/** Clicks the element whose text matches, inside the given selector group. */
async function clickByText(page, selector, text) {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(t));
      if (!el) return false;
      el.click();
      return true;
    },
    selector,
    text,
  );
  if (!ok) throw new Error(`no element matching "${text}" for ${selector}`);
  await sleep(350);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--force-device-scale-factor=2', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => localStorage.clear());
  await page.setViewport({ width: 1320, height: 1120, deviceScaleFactor: 2 });

  // 1. BFS mid run, a few steps in so the graph is colored
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await settle(page);
  await clickByText(page, '.subtab', 'הרצה');
  await settle(page);
  for (let i = 0; i < 9; i++) await clickByText(page, '.btn', 'הבא');
  await settle(page);
  await page.screenshot({ path: `${OUT}/run-bfs.png` });

  // 2. Dijkstra failing on a negative weight, with the truth beside it
  await clickByText(page, '.nav-tab', 'Dijkstra');
  await settle(page);
  await clickByText(page, '.chip', 'הגרף עם משקל שלילי');
  await settle(page);
  for (let i = 0; i < 4; i++) await clickByText(page, '.btn', 'הבא');
  await settle(page);
  await page.screenshot({ path: `${OUT}/dijkstra-negative.png` });

  // 3. Side by side comparison
  await clickByText(page, '.nav-tab', 'השוואה זו לצד זו');
  await settle(page);
  for (let i = 0; i < 12; i++) await clickByText(page, '.btn', 'הבא');
  await settle(page);
  await page.screenshot({ path: `${OUT}/compare.png` });

  // 4. The summary table
  await clickByText(page, '.nav-tab', 'הכל במקום אחד');
  await settle(page);
  await page.screenshot({ path: `${OUT}/table.png` });

  // 5. Narrow screen
  await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await settle(page);
  await clickByText(page, '.subtab', 'הרצה');
  await settle(page);
  for (let i = 0; i < 7; i++) await clickByText(page, '.btn', 'הבא');
  await settle(page);
  await page.screenshot({ path: `${OUT}/mobile.png` });

  await browser.close();
  console.log('screenshots written to', OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
