// @ts-check
// Section 4.8 "Fallback": the sidebyside page at 390px shows top and bottom.
// The CSS decision is the container query @container cpf (min-width:1100px):
// below it both files are top-and-bottom (single grid track, flow above the
// table). At or above the break the file's own layout applies.
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, SIZES, LAYOUTS } from "./_common.mjs";

const BREAKPOINT = 1100; // pinned in the page CSS: @container cpf (min-width:1100px)

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] fallback ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        const m = await page.evaluate(`(() => {
          const grid = getComputedStyle(document.querySelector('.cpf-main')).gridTemplateColumns;
          const f = document.querySelector('.cpf-flow').getBoundingClientRect();
          const d = document.querySelector('.cpf-detail').getBoundingClientRect();
          return { tracks: grid.split(/\\s+/).length, flow: { x: f.x, y: f.y, w: f.width, h: f.height }, detail: { x: d.x, y: d.y } };
        })()`);
        const topbottom = size.width < BREAKPOINT || layout === "topbottom";
        if (topbottom) {
          assert.equal(m.tracks, 1, "single grid track (top and bottom): " + JSON.stringify(m));
          assert.equal(m.detail.y >= m.flow.y + m.flow.h, true, "flow above the table: " + JSON.stringify(m));
        } else {
          assert.equal(m.tracks, 2, "two grid tracks (side by side): " + JSON.stringify(m));
          assert.equal(m.detail.x >= m.flow.x + m.flow.w, true, "table right of the flow: " + JSON.stringify(m));
        }
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
