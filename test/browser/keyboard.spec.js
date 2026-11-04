// @ts-check
// Section 4.8 "Keyboard": Tab to a back link and press Enter. Same result as
// a click, and the focus ring is visible. Tabbing is real user interaction,
// so :focus-visible matches; the ring evidence is a pixel diff: the clip
// around the focused link with the ring vs after activeElement.blur() must
// differ (deterministic PNG encoder, same clip, no mouse move).
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, selectors, SIZES, LAYOUTS } from "./_common.mjs";

const TARGET = selectors.back15; // '#detail-e15 th a.back'

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] keyboard ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        // Tab until the back link of the last row has focus (user interaction)
        let found = false;
        for (let i = 0; i < 250 && !found; i++) {
          await page.keyboard.press("Tab");
          found = await page.evaluate(`(() => {
            const a = document.activeElement;
            const t = document.querySelector('${TARGET}');
            return a === t;
          })()`);
        }
        assert.equal(found, true, "Tab reaches the back link of the last row");
        const fv = await page.evaluate(`(() => document.activeElement.matches(':focus-visible'))()`);
        assert.equal(fv, true, "the focused link matches :focus-visible (the UA ring is drawn)");
        // make it visible for the ring screenshots
        await page.evaluate(`(() => document.activeElement.scrollIntoView())()`);
        await page.waitForTimeout(50);
        const clip = await page.evaluate(`(() => {
          const b = document.activeElement.getBoundingClientRect();
          const vw = document.documentElement.clientWidth;
          const vh = document.documentElement.clientHeight;
          const x = Math.max(0, b.x - 8);
          const y = Math.max(0, b.y - 8);
          return { x, y, width: Math.min(vw - x, b.width + 16), height: Math.min(vh - y, b.height + 16) };
        })()`);
        const focused = await page.screenshot({ type: "png", clip });
        await page.evaluate(`(() => document.activeElement.blur())()`);
        await page.waitForTimeout(50);
        const unfocused = await page.screenshot({ type: "png", clip });
        assert.notEqual(Buffer.compare(Buffer.from(focused), Buffer.from(unfocused)), 0, "focus ring pixels present while focused: clip " + JSON.stringify(clip));
        // Enter on the link: same navigation as a click
        await page.focus(TARGET);
        await page.keyboard.press("Enter");
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
        assert.equal(gv && gh, true, "#flow-e15 in view after Enter: " + JSON.stringify(m));
        const flowTop = Math.max(m.f.y, 0);
        const flowBottom = Math.min(m.f.y + m.f.h, m.vh);
        assert.equal(m.g.y >= flowTop - 1 && m.g.y + m.g.h <= flowBottom + 1, true, "#flow-e15 inside the diagram box: " + JSON.stringify(m));
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
