// @ts-check
// Section 4.8 "Switch": click the other layout's label, then the current one.
// The layout changes each time, no reload. At 390px the container-query
// fallback dominates the radio choice (the layout cannot change there): the
// control still toggles (:checked), which is what this check pins at narrow
// widths. (Fallback itself is pinned by fallback.spec.js.)
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, SIZES, LAYOUTS } from "./_common.mjs";

const BREAKPOINT = 1100; // same pinned break as fallback.spec.js

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] switch ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        const first = layout === "sidebyside" ? "lay-tb" : "lay-sbs";
        const second = layout === "sidebyside" ? "lay-sbs" : "lay-tb";
        const grid0 = await page.evaluate(`(() => getComputedStyle(document.querySelector('.cpf-main')).gridTemplateColumns)()`);
        await page.click("label[for=\"" + first + "\"]");
        await page.waitForTimeout(150);
        const grid1 = await page.evaluate(`(() => getComputedStyle(document.querySelector('.cpf-main')).gridTemplateColumns)()`);
        await page.click("label[for=\"" + second + "\"]");
        await page.waitForTimeout(150);
        const grid2 = await page.evaluate(`(() => {
          return {
            grid: getComputedStyle(document.querySelector('.cpf-main')).gridTemplateColumns,
            firstChecked: document.getElementById('${first}').matches(':checked'),
            secondChecked: document.getElementById('${second}').matches(':checked')
          };
        })()`);
        if (size.width >= BREAKPOINT) {
          assert.notEqual(grid1, grid0, "first click changed the layout: " + grid0 + " -> " + grid1);
          assert.notEqual(grid2.grid, grid1, "second click changed the layout: " + grid1 + " -> " + grid2.grid);
        } else {
          // narrow: the fallback pins the visual layout; only the radio state moves
          assert.equal(grid1, grid0, "fallback width keeps the layout: " + grid0);
          assert.equal(grid2.grid, grid0, "fallback width keeps the layout: " + grid2.grid);
        }
        assert.equal(grid2.firstChecked, false, first + " unchecked after leaving it");
        assert.equal(grid2.secondChecked, true, second + " checked after clicking back");
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
