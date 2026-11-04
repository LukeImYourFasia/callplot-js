// @ts-check
// Section 4.8 "Back link, top and bottom": open the approved snapshot page,
// scroll the table sideways to the far right, click the back link of the
// last row. Pass when #flow-e15 is in view, up-down and sideways, inside
// the diagram box.
// Chromium scrolls to an SVG <g> fragment target natively (pinned by tools/svg-target-probe.mjs):
// no <a id> workaround is needed, so the approved page output is unchanged.
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, selectors, SIZES, LAYOUTS } from "./_common.mjs";

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] backlink ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        // scroll the table sideways to the far right: at the scroller that
        // actually holds the table (the pane scroller when it has overflow,
        // the page itself otherwise)
        await page.evaluate(`(() => {
          const t = document.querySelector('.cpf-tscroll');
          if (t.scrollWidth > t.clientWidth) { t.scrollLeft = t.scrollWidth; }
          else { const de = document.scrollingElement; de.scrollLeft = de.scrollWidth; }
        })()`);
        await page.click(selectors.back15);
        await page.waitForTimeout(150);
        const m = await page.evaluate(`(() => {
          const g = document.getElementById('flow-e15').getBoundingClientRect();
          const f = document.querySelector('.cpf-flow').getBoundingClientRect();
          return {
            g: { x: g.x, y: g.y, w: g.width, h: g.height },
            f: { x: f.x, y: f.y, w: f.width, h: f.height },
            vw: document.documentElement.clientWidth,
            vh: document.documentElement.clientHeight
          };
        })()`);
        const gv = m.g.y < m.vh && m.g.y + m.g.h > 0;
        const gh = m.g.x < m.vw && m.g.x + m.g.w > 0;
        const flowTop = Math.max(m.f.y, 0);
        const flowBottom = Math.min(m.f.y + m.f.h, m.vh);
        const inside = m.g.y >= flowTop - 1 && m.g.y + m.g.h <= flowBottom + 1;
        assert.equal(gv && gh, true, "#flow-e15 in view up-down and sideways: " + JSON.stringify(m));
        assert.equal(inside, true, "#flow-e15 inside the diagram box: " + JSON.stringify(m));
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
