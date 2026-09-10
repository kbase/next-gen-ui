const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 140)));
  const shot = (n) => page.screenshot({ path: `/tmp/walk-${n}.png` });

  // 1. First open, nothing saved.
  await page.goto(`${BASE}/workbench`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/workbench`);
  await page.waitForTimeout(5000);
  await shot('1-first-open');

  // 2. Type a protein, take the offer.
  await page.locator('textarea').click();
  await page.locator('textarea').type('P0AEX9', { delay: 40 });
  await page.waitForTimeout(1400);
  await shot('2-offers');
  await page.locator('[role="option"]', { hasText: 'Function Junction' }).click();
  await page.waitForTimeout(12000);
  await shot('3-dossier');

  // 3. Add the report, then a line.
  const addAll = page.locator('button', { hasText: /^Add$/ });
  if (await addAll.count()) await addAll.first().click();
  await page.waitForTimeout(1500);
  const line = page.locator('button', { hasText: /^Add$/ });
  if (await line.count()) await line.first().click();
  await page.waitForTimeout(2500);
  await shot('4-cart-filled');

  // 4. Open a cart item's preview.
  const tile = page.locator('[class*="cartOpen"]').first();
  if (await tile.count()) { await tile.click(); await page.waitForTimeout(1200); await shot('5-preview'); await page.keyboard.press('Escape'); }

  // 5. Take a related row, landing in genKnown.
  await page.waitForTimeout(1500);
  const row = page.locator('[class*="relatedOpen"]').first();
  if (await row.count()) { await row.click(); await page.waitForTimeout(9000); await shot('6-genknown'); }

  // 6. Light mode, same screen.
  await page.evaluate(() => { localStorage.setItem('kbase-theme', 'light'); document.documentElement.setAttribute('data-theme', 'light'); });
  await page.waitForTimeout(1200);
  await shot('7-light');

  // 7. Reload: does everything come back.
  await page.reload();
  await page.waitForTimeout(9000);
  await shot('8-reloaded');
  const state = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll('[role="tab"]')].map((t) => t.textContent.trim()),
    cart: JSON.parse(localStorage.getItem('kbase-workbench-cart') || '[]').length,
    blocks: [...document.querySelectorAll('[class*="blockHeader"]')].map((b) => b.innerText.split('\n')[0]),
  }));
  console.log('after reload:', JSON.stringify(state));
  console.log('errors:', JSON.stringify([...new Set(errs)]));
  await b.close();
})();
