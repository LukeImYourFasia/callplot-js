// @ts-check
// Section 4.8 "Forward link": click the badge of event 10 (a.badge, href
// #detail-e10). Pass when row #detail-e10 is in view and highlighted by the
// CSS rule tr:target th,tr:target td{background:var(--cpf-hl)}.
import { test } from "node:test";
import assert from "node:assert";
import { openPage, closePage, selectors, SIZES, LAYOUTS } from "./_common.mjs";

for (const layout of LAYOUTS) {
  for (const size of SIZES) {
    test(`[browser] forward ${layout} ${size.width}x${size.height}`, async () => {
      const { browser, page } = await openPage(size.width, size.height, layout);
      try {
        await page.evaluate(`(() => {
          const t = document.querySelector('.cpf-scroll');
          if (t.scrollWidth > t.clientWidth) { t.scrollLeft = t.scrollWidth; }
          else { const de = document.scrollingElement; de.scrollLeft = de.scrollWidth; }
        })()`);
        await page.click(selectors.badge10);
        await page.waitForTimeout(150);
        const m = await page.evaluate(`(() => {
          const tr = document.getElementById('detail-e10');
          const b = tr.getBoundingClientRect();
          const th = tr.querySelector('th');
          const other = document.getElementById('detail-e11').querySelector('th');
          const raw = getComputedStyle(document.querySelector('.cpf')).getPropertyValue('--cpf-hl').trim();
          const mm = raw.match(/^rgba?\\(([^)]+)\\)$/);
          const parts = mm[1].split(",").map((v) => String(parseFloat(v.trim())));
          const expected = parts.length === 3
            ? "rgb(" + parts.join(", ") + ")"
            : "rgba(" + parts[0] + ", " + parts[1] + ", " + parts[2] + ", " + parts[3] + ")";
          return {
            target: tr.matches(":target"),
            bg: getComputedStyle(th).backgroundColor,
            expected,
            otherBg: getComputedStyle(other).backgroundColor,
            row: { x: b.x, y: b.y, w: b.width, h: b.height },
            vw: document.documentElement.clientWidth,
            vh: document.documentElement.clientHeight
          };
        })()`);
        assert.equal(m.target, true, "#detail-e10 is the :target after the badge click");
        assert.equal(m.bg, m.expected, "row 10 highlighted with --cpf-hl: " + m.bg + " vs " + m.expected);
        assert.notEqual(m.otherBg, m.bg, "row 11 not highlighted: " + m.otherBg);
        const r = m.row;
        assert.equal(r.x < m.vw && r.x + r.w > 0 && r.y < m.vh && r.y + r.h > 0, true, "row #detail-e10 in view: " + JSON.stringify(r));
      } finally {
        await closePage({ browser, page });
      }
    });
  }
}
