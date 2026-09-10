const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  await page.goto(`${BASE}/workbench`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(12000);

  // The order the sidebar renders, and genKnown's mark.
  const heads = (await page.locator('[class*="blockHeader"]').allInnerTexts()).map((t) => t.split('\n')[0]);
  console.log(heads[heads.length - 1] === 'Related' ? 'PASS  Related is last' : `FAIL  order: ${heads.join(' / ')}`);

  // Add from FJ's own page, the way a user would.
  const add = page.locator('button', { hasText: /^Add$/ }).first();
  await add.click();
  await page.waitForTimeout(2000);
  const terms = await page.evaluate(() => JSON.parse(localStorage.getItem('kbase-workbench-cart') || '[]').map((i) => `${i.id} → ${(i.terms || []).join('+') || 'NO TERMS'}`));
  console.log(terms.every((t) => !/NO TERMS/.test(t)) ? `PASS  cart item carries terms: ${terms}` : `FAIL  ${terms}`);

  // Move off the page — a different front tab, not just a different URL.
  await page.goto(`${BASE}/workbench`);
  await page.waitForTimeout(5000);
  const home = page.locator('[role="tab"]', { hasText: /Home|Settings/ }).first();
  if (await home.count()) await home.click();
  else { await page.locator('button', { hasText: 'Browse' }).first().click(); }
  await page.waitForTimeout(7000);
  console.log('front tab now:', (await page.locator('[role="tab"][aria-selected="true"]').innerText().catch(() => '(none)')).trim());
  const pane = (await page.locator('[class*="related_"]').innerText().catch(() => '(none)')).replace(/\n/g, ' | ');
  console.log(/🛒|item/.test(pane) ? `PASS  cart section: ${pane}` : `FAIL  no cart section: ${pane}`);

  const icons = await page.locator('[aria-label="Pinned plugins"] button svg').evaluateAll((es) => es.map((e) => e.innerHTML.slice(0, 40)));
  console.log('rail glyphs distinct:', new Set(icons).size, 'of', icons.length);
  await b.close();
})();
