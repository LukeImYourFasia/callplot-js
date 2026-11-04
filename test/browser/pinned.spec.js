// @ts-check
// Section 4.8 "Pinned column": scroll the table sideways. Column 1 (the
// back-link cells, th[scope="row"] position:sticky;left:0) stays fully
// visible. Decision (my layout call, logged in progress.md): pinning applies
// to the scroller that holds the table (.cpf-tscroll). In the side-by-side
// pane that scroller really scrolls (content wider than the pane) and the
// cells must stay pinned to its left edge. In top-and-bottom the page itself
// scrolls sideways (the table fits its scroller, so the sideways scroll is a
// no-op there); the check that holds in all four combinations is that every
// row fully inside the viewport has its first cell fully visible.
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, SIZES, LAYOUTS } from "./_common.mjs";

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] pinned ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        await page.evaluate(`(() => {
          const t = document.querySelector('.cpf-tscroll');
          t.scrollLeft = t.scrollWidth; // real at side-by-side >= 1100px, no-op elsewhere
          t.scrollIntoView({ block: "start", inline: "nearest" }); // bring the table into view
        })()`);
        const m = await page.evaluate(`(() => {
          const t = document.querySelector('.cpf-tscroll').getBoundingClientRect();
          const vh = document.documentElement.clientHeight;
          const vw = document.documentElement.clientWidth;
          const rows = [];
          for (let n = 1; n <= 40; n++) {
            const tr = document.getElementById('detail-e' + n);
            if (!tr) continue; // pages with fewer events end their rows sooner
            const th = tr.querySelector('th');
            const b = th.getBoundingClientRect();
            if (b.y >= 0 && b.y + b.height <= vh) {
              rows.push({ n, x: b.x, w: b.width });
            }
          }
          return { pane: { x: t.x, w: t.width }, sw: document.querySelector('.cpf-tscroll').scrollWidth, cw: document.querySelector('.cpf-tscroll').clientWidth, vw, rows };
        })()`);
        assert.ok(m.rows.length >= 3, "at least three table rows fully in view: " + JSON.stringify(m.rows));
        for (const r of m.rows) {
          assert.ok(r.x >= 0 && r.x + r.w <= m.vw, "row " + r.n + " back-link cell fully visible: " + JSON.stringify(r));
          if (m.sw > m.cw) {
            // a real sideways scroll happened: the cell is pinned to the pane edge
            assert.ok(r.x >= m.pane.x - 1 && r.x <= m.pane.x + 48, "row " + r.n + " cell pinned to pane left edge: " + JSON.stringify(r));
          }
        }
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
