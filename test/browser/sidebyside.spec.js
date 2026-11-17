// @ts-check
// Section 4.8 "Side by side": open the page, click a back link: the diagram
// pane scrolls and the table pane does NOT move. Row 5 is first
// into view with scrollIntoView so the click itself adds no auto-scroll
// noise. My call (logged in progress.md): "diagram pane scrolls" means the
// container showing the diagram scrolled (the .cpf-scroll pane at >= 1100px,
// the page in the fallback), and the scroller holding the table (.cpf-tscroll)
// keeps its scroll position across the click.
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, selectors, SIZES, LAYOUTS } from "./_common.mjs";

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] sidebyside ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        const before = await page.evaluate(`(() => {
          document.getElementById('detail-e5').scrollIntoView({ block: "center", inline: "nearest" }); // bring row 5 into view in its own scroller
          const de = document.scrollingElement;
          const sc = document.querySelector('.cpf-scroll');
          const tsc = document.querySelector('.cpf-tscroll');
          const g = document.getElementById('flow-e5').getBoundingClientRect();
          return { doc: { left: de.scrollLeft, top: de.scrollTop }, sc: { left: sc.scrollLeft, top: sc.scrollTop }, tsc: { left: tsc.scrollLeft, top: tsc.scrollTop }, gy: Math.round(g.y) };
        })()`);
        await page.click(selectors.back05);
        await page.waitForTimeout(150);
        const m = await page.evaluate(`(() => {
          const de = document.scrollingElement;
          const sc = document.querySelector('.cpf-scroll');
          const tsc = document.querySelector('.cpf-tscroll');
          const g = document.getElementById('flow-e5').getBoundingClientRect();
          return { doc: { left: de.scrollLeft, top: de.scrollTop }, sc: { left: sc.scrollLeft, top: sc.scrollTop }, tsc: { left: tsc.scrollLeft, top: tsc.scrollTop }, gy: Math.round(g.y) };
        })()`);
        assert.equal(JSON.stringify(m.tsc), JSON.stringify(before.tsc), "table pane did not move");
        const diagramScrolled = m.sc.top !== before.sc.top || m.sc.left !== before.sc.left ||
          m.doc.top !== before.doc.top || m.doc.left !== before.doc.left || m.gy !== before.gy;
        assert.equal(diagramScrolled, true, "diagram pane scrolled: " + JSON.stringify({ before, m }));
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
