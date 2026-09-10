const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  await page.goto(`${BASE}/workbench`);
  await page.evaluate(() => localStorage.clear());

  // Add a protein from its own page, then open a different one.
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(12000);
  const crumb = await page.locator('[class*="crumbs"]').innerText();
  console.log('P0AEX9 page crumb:', crumb.replace(/\n/g, ' '));
  await page.locator('button', { hasText: /^Add$/ }).first().click();
  await page.waitForTimeout(2000);

  await page.goto(`${BASE}/p/function-junction/protein/P0A7B8`);
  await page.waitForTimeout(12000);
  console.log('P0A7B8 page crumb:', (await page.locator('[class*="crumbs"]').innerText()).replace(/\n/g, ' '));
  const pane = (await page.locator('[class*="related_"]').innerText().catch(() => '(none)')).replace(/\n/g, ' | ');
  console.log('pane:', pane);
  console.log(/🛒|ITEM/.test(pane) ? 'PASS  the cart is asked about separately' : 'FAIL  no cart section with a different protein held');
  await page.screenshot({ path: '/tmp/two-proteins.png' });
  await b.close();
})();
