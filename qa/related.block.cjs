const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
let pass = 0, fail = 0;
const check = (id, expected, actual, ok) => { ok ? pass++ : fail++; console.log(`${ok?'PASS':'FAIL'}  ${id}\n      expected: ${expected}\n      actual:   ${actual}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 120)));
  const settle = (ms = 1500) => page.waitForTimeout(ms);
  const rows = () => page.locator('[class*="relatedOpen"]');

  await page.goto(`${BASE}/workbench`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(11000);

  // B1 — fold the block from its own header
  const header = page.locator('[class*="blockToggle"]', { hasText: 'Related' }).first();
  await header.click();
  await settle();
  check('B1 fold', 'rows hidden after folding', `${await rows().count()} rows`, (await rows().count()) === 0);
  await header.click();
  await settle();
  check('B1b unfold', 'rows back', `${await rows().count()} rows`, (await rows().count()) > 0);

  // B2 — survives a reload, still pinned and in place
  await page.reload();
  await page.waitForTimeout(9000);
  const heads = (await page.locator('[class*="blockHeader"]').allInnerTexts()).map((t) => t.split('\n')[0]);
  check('B2 pinned after reload', 'Related still in the stack', heads.join(' / '), heads.includes('Related'));

  // B3 — collapsed sidebar
  const collapse = page.locator('button[aria-label*="idebar"]').first();
  if (await collapse.count()) { await collapse.click(); await settle(); }
  const railNames = await page.locator('[aria-label="Pinned plugins"] button').evaluateAll(
    (bs) => bs.map((b) => b.getAttribute('aria-label') || b.title || b.textContent.trim()));
  check('B3 collapsed rail', 'Related has an icon in the pinned rail', JSON.stringify(railNames),
        railNames.some((n) => /related/i.test(n)));
  if (await collapse.count()) { await collapse.click(); await settle(); }

  // B4 — light mode contrast of a row and the empty line
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await settle(800);
  // Chromium's canvas will not parse oklch, which is how these tokens resolve,
  // so this compares OKLCH lightness — a proxy, enough to catch a row drawn in
  // a colour near its own background.
  const lightness = await page.evaluate(() => {
    const el = document.querySelector('[class*="relatedOpen"]');
    if (!el) return null;
    const L = (v) => Number((/oklch\(([\d.]+)/.exec(v) || [])[1] ?? NaN);
    let node = el, bg = 'rgba(0, 0, 0, 0)';
    while (node && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) { bg = getComputedStyle(node).backgroundColor; node = node.parentElement; }
    return { fg: L(getComputedStyle(el).color), bg: L(bg) };
  });
  const gap = lightness ? Math.abs(lightness.fg - lightness.bg) : 0;
  check('B4 light-mode row separation', 'lightness gap > 0.4', JSON.stringify({ ...lightness, gap: gap.toFixed(2) }), gap > 0.4);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

  // B5 — rapid tab switching leaves no stale rows
  await page.locator('[class*="relatedOpen"]').first().click();
  await settle(2500);
  for (let i = 0; i < 4; i++) {
    await page.locator('[role="tab"]', { hasText: 'P0AEX9' }).first().click();
    await page.waitForTimeout(120);
    await page.locator('[role="tab"]', { hasText: '83333' }).first().click();
    await page.waitForTimeout(120);
  }
  await settle(3000);
  const front = await page.locator('[role="tab"][aria-selected="true"]').innerText();
  const paneNow = (await page.locator('[class*="related_"]').innerText().catch(() => '')).replace(/\n/g, ' | ');
  check('B5 no stale rows after switching', `rows about the front tab (${front.trim()})`, paneNow,
        !/Taxon dossier for taxon 83333/.test(paneNow) || !/83333/.test(front));

  // B6 — regressions around what was touched
  await page.goto(`${BASE}/workbench`);
  await settle(4000);
  const composer = await page.locator('[class*="promptContext"]').innerText().catch(() => '(none)');
  check('B6 composer destination', 'assistant › thread trail', composer.replace(/\n/g, ' '), /KOROS/.test(composer));
  await page.locator('textarea').fill('');
  await page.locator('textarea').type('P0AEX9', { delay: 40 });
  await settle(1500);
  const options = await page.locator('[role="option"]').allInnerTexts();
  check('B6b prompt offers', 'Send row + FJ offer, no Browse', options.join(' | ').replace(/\n/g, ' '),
        options.length === 2 && /Function Junction/.test(options.join(' ')));
  await page.locator('textarea').fill('');
  await settle(800);

  const settings = page.locator('button', { hasText: 'Settings' }).first();
  await settings.click();
  await settle(2500);
  check('B6c settings opens', 'Installed heading', await page.locator('h2', { hasText: 'Installed' }).count(), (await page.locator('h2', { hasText: 'Installed' }).count()) > 0);
  const listed = await page.locator('[class*="list"] li').allInnerTexts().catch(() => []);
  check('B6d Related is manageable', 'listed in Settings so it can be unpinned', listed.join(' | ').replace(/\n/g,' ').slice(0,120), listed.join(' ').includes('Related'));

  console.log('\nerrors:', JSON.stringify([...new Set(errs)].slice(0, 5)));
  await page.screenshot({ path: '/tmp/qa/batch2.png' });
  await browser.close();
  console.log(`\n${pass}/${pass + fail} pass`);
})();
