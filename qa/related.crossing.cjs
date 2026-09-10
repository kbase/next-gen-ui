const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const pane = async () => (await page.locator('[class*="related_"]').innerText().catch(() => '(none)')).replace(/\n/g, ' | ');
  await page.goto(`${BASE}/workbench`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(12000);
  console.log('1. on P0AEX9 (taxon 83333):', await pane());

  // Add the annotation line, whose STRING xref names a different taxon.
  // The card that carries the cross-references, by name.
  const card = page.locator('[id^="card-"]', { hasText: 'Function & Evidence' }).first();
  await card.locator('button', { hasText: /^Add$/ }).first().click();
  await page.waitForTimeout(3000);
  console.log('2. after adding a line:', await pane());
  console.log('   cart terms:', await page.evaluate(() => JSON.parse(localStorage.getItem('kbase-workbench-cart')||'[]').map(i=>(i.terms||[]).join('+'))));

  // Follow the new proposal into genKnown.
  const rows = page.locator('[class*="relatedOpen"]');
  const labels = await rows.allInnerTexts();
  const target = labels.findIndex((l) => /511145/.test(l));
  if (target >= 0) { await rows.nth(target).click(); await page.waitForTimeout(9000); }
  console.log('3. opened:', (await page.locator('[class*="crumbs"]').innerText()).replace(/\n/g,' '), '|', await pane());
  await page.screenshot({ path: '/tmp/demo.png' });
  await b.close();
})();
