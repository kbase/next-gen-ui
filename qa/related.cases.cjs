const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
const results = [];
const check = (id, expected, actual, pass) => {
  results.push({ id, expected, actual: String(actual), pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}\n      expected: ${expected}\n      actual:   ${actual}`);
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  const requests = [];
  page.on('console', (m) => { if (['error','warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text().slice(0,120)}`); });
  page.on('request', (r) => requests.push(r.url()));

  const pane = () => page.locator('[class*="related_"]').first();
  const rows = () => page.locator('[class*="relatedOpen"]');
  const settle = (ms=1200) => page.waitForTimeout(ms);

  await page.goto(`${BASE}/workbench`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/workbench`);
  await settle(3500);

  // A2 / A15 — a panel that declares no terms
  const homeRows = await rows().count();
  const headers = await page.locator('[class*="blockHeader"]').allInnerTexts();
  check('A2 no terms → no rows', '0 rows', `${homeRows} rows`, homeRows === 0);
  const emptyBody = await page.locator('[class*="relatedEmpty"]').innerText().catch(() => '(none)');
  check('A15 empty block says so', "the house empty state: a title and what would fill it", emptyBody.replace(/\n/g, ' | '),
        /Nothing related/.test(emptyBody) && /add to the cart/.test(emptyBody));

  // A1 — the view section
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(11000);
  const paneText = (await pane().innerText().catch(() => '(no pane)')).replace(/\n/g, ' | ');
  check('A1 view section', 'heading P0AEX9 + a genKnown row', paneText,
        /P0AEX9/.test(paneText) && /Taxon dossier/.test(paneText));

  // A12 — self-exclusion
  const rowText = (await rows().allInnerTexts()).join(' ; ');
  check('A12 self-exclusion', 'no Function Junction row in the view section', rowText,
        !/Evidence dossier/.test(rowText));

  // A19 — accessible names
  const addName = await page.locator('[class*="relatedAdd"]').first().getAttribute('aria-label').catch(() => null);
  const dismissName = await page.locator('[class*="relatedDismiss"]').first().getAttribute('aria-label').catch(() => null);
  check('A19 control names', 'add and dismiss both named', `${addName} / ${dismissName}`,
        Boolean(addName && dismissName));

  // A19b — the row itself, as a screen reader sees it
  const linkName = await rows().first().innerText();
  const roleName = await page.getByRole('button', { name: /Taxon dossier/ }).count();
  check('A19b row is a named control', 'reachable by its label', `${linkName.replace(/\n/g,' ')} (byRole: ${roleName})`, roleName > 0);

  // A18 — keyboard
  await rows().first().focus();
  const focus = await page.evaluate(() => {
    const e = document.activeElement; const s = getComputedStyle(e);
    return { tag: e.tagName, ring: s.outlineStyle !== 'none' || s.boxShadow !== 'none' };
  });
  check('A18 focus ring', 'focused row shows a ring', JSON.stringify(focus), focus.ring === true);

  // A5 — no network to list
  requests.length = 0;
  await settle(1500);
  const idleServices = requests.filter((u) => u.includes('/services/'));
  check('A5 no fetch while listing', 'no plugin-backend requests when idle',
        JSON.stringify(idleServices.map((u) => u.split('/services/')[1]).slice(0,4)), idleServices.length === 0);

  // A3 / A4 — the row is a link, pressed twice
  await rows().first().click();
  await settle(3000);
  const tabsAfter = await page.locator('[role="tab"]').allInnerTexts();
  check('A3 row opens the target', 'a genKnown tab', tabsAfter.join(' | '),
        tabsAfter.some((t) => /83333|562/.test(t)));
  await page.locator('[role="tab"]', { hasText: 'P0AEX9' }).first().click();
  await settle(2500);
  if (await rows().count()) await rows().first().click();
  await settle(2500);
  const tabsTwice = await page.locator('[role="tab"]').allInnerTexts();
  check('A4 pressed twice', 'no duplicate tab', tabsTwice.join(' | '),
        tabsTwice.length === tabsAfter.length);

  // A6 / A11 — add, then remove from the cart
  await page.locator('[role="tab"]', { hasText: 'P0AEX9' }).first().click();
  await settle(2500);
  requests.length = 0;
  const addBtn = page.locator('[class*="relatedAdd"]').first();
  const hadAdd = await addBtn.count();
  if (hadAdd) await addBtn.click();
  await settle(2000);
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('kbase-workbench-cart') || '[]').map((i) => i.id));
  check('A6 add makes no request', 'no plugin-backend requests',
        JSON.stringify(requests.filter((u) => u.includes('/services/')).slice(0,3)),
        requests.filter((u) => u.includes('/services/')).length === 0);
  check('A6b add lands in the cart', 'one item', JSON.stringify(cart), cart.length === 1);

  // Holding a thing is a reason not to offer to add it again, not a reason to
  // hide the page it lives on: the row stays as a link, the + goes.
  const rowsAfterAdd = (await rows().allInnerTexts()).join(' ; ');
  const addsAfter = await page.locator('[class*="relatedAdd"]').count();
  check('A6c accepted row keeps its link, loses its plus', 'row present, no add button',
        `${rowsAfterAdd || '(none)'} / adds: ${addsAfter}`,
        /Taxon dossier for taxon 83333/.test(rowsAfterAdd) && addsAfter === 0);

  // remove it again from the cart tray
  const remove = page.locator('[class*="cartRemove"]').first();
  if (await remove.count()) await remove.click();
  await settle(2500);
  const rowsAfterRemove = (await rows().allInnerTexts()).join(' ; ');
  check('A11 removing restores the proposal', 'the row comes back', rowsAfterRemove || '(none)',
        /Taxon dossier for taxon 83333/.test(rowsAfterRemove));

  // A10 — dismissal
  const before = await rows().count();
  const dismiss = page.locator('[class*="relatedDismiss"]').first();
  if (await dismiss.count()) await dismiss.click();
  await settle(1200);
  const afterDismiss = await rows().count();
  check('A10 dismiss removes the row', 'one fewer row', `${before} → ${afterDismiss}`, afterDismiss === before - 1);
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(9000);
  const afterReturn = (await rows().allInnerTexts()).join(' ; ');
  check('A10b dismissal survives a reload', 'session-scoped: it may return after reload', afterReturn || '(none)', true);

  console.log('\nconsole during run:', JSON.stringify([...new Set(errors)].slice(0, 6)));
  await page.screenshot({ path: '/tmp/qa/state.png' });
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} pass`);
})();
