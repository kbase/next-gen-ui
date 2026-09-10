const { chromium } = require('playwright');
const BASE = 'https://canopy.rudd-mohs.ts.net';
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  // A layout saved before the Related block existed: no `introduced`, not pinned.
  // The layout is only written once something changes it, so open a page
  // first — otherwise there is no saved layout to age and the check is void.
  await page.goto(`${BASE}/p/function-junction/protein/P0AEX9`);
  await page.waitForTimeout(9000);
  const old = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('workbench.layout.v1') || 'null');
    if (!raw) return 'no layout to age';
    delete raw.introduced;
    raw.sidebar.pinned = raw.sidebar.pinned.filter((p) => p !== 'related');
    localStorage.setItem('workbench.layout.v1', JSON.stringify(raw));
    return raw.sidebar.pinned.join(',');
  });
  console.log('aged layout pinned:', old);
  await page.reload();
  await page.waitForTimeout(5000);
  const heads = (await page.locator('[class*="blockHeader"]').allInnerTexts()).map((t) => t.split('\n')[0]);
  console.log('after reload:', heads.join(' / '));
  console.log(heads.includes('Related') ? 'PASS  a new host block reaches an existing layout' : 'FAIL  block never appears for existing users');
  // And it stays away once unpinned.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('workbench.layout.v1'));
    raw.sidebar.pinned = raw.sidebar.pinned.filter((p) => p !== 'related');
    localStorage.setItem('workbench.layout.v1', JSON.stringify(raw));
  });
  await page.reload();
  await page.waitForTimeout(5000);
  const heads2 = (await page.locator('[class*="blockHeader"]').allInnerTexts()).map((t) => t.split('\n')[0]);
  console.log('after unpinning:', heads2.join(' / '));
  console.log(!heads2.includes('Related') ? 'PASS  an unpinned block stays unpinned' : 'FAIL  re-pins something the user removed');
  await b.close();
})();
