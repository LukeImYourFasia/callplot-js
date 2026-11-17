// @ts-check
// Shared helpers for the browser tests (section 4.8). Chromium at the two
// pinned widths, both layouts. The snapshot files are the pages under test:
// the approved snapshots themselves, opened as file:// URLs.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

export const SIZES = [
  { width: 1600, height: 1000 },
  { width: 390, height: 844 }
];

export const LAYOUTS = ["topbottom", "sidebyside"];

export async function openPage(width, height, layout) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  const file = "test/snapshots/s_sip_annot.html-" + layout + ".html";
  await page.goto(pathToFileURL(fs.realpathSync(file)).toString());
  return { browser, page };
}

export async function closePage(handle) {
  await handle.page.close();
  await handle.browser.close();
}

// The page as seen from inside the browser: rects + scroll state of the two
// scrollers and the panes that hold them.
export const PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const r = (e) => { const b = e === null ? null : e.getBoundingClientRect(); return b === null ? null : { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) }; };
  const sc = (e) => e === null || e.scrollLeft === undefined ? null : {
    left: e.scrollLeft, top: e.scrollTop, w: e.clientWidth, h: e.clientHeight, rect: r(e)
  };
  const hl = (id) => { const tr = document.getElementById(id); const td = tr === null ? null : tr.querySelector('th'); return td === null ? null : getComputedStyle(td).backgroundColor; };
  return {
    grid: getComputedStyle(q('.cpf-main')).gridTemplateColumns,
    flow: r(q('.cpf-flow')),
    detail: r(q('.cpf-detail')),
    scroll: sc(q('.cpf-scroll')),
    tscroll: sc(q('.cpf-tscroll')),
    g30: r(document.getElementById('flow-e30')),
    g10: r(document.getElementById('flow-e10')),
    tr30: r(document.getElementById('detail-e30')),
    th30: r(document.getElementById('detail-e30').querySelector('th')),
    badge10: r(document.getElementById('flow-e10').querySelector('a.badge')),
    back15: r(document.getElementById('detail-e15').querySelector('a.back')),
    rowHl: hl('detail-e30')
  };
})()`;

// Clicks for the section 4.8 tests.
export const selectors = {
  back15: '#detail-e15 th a.back',
  back05: '#detail-e5 th a.back',
  badge10: '#flow-e10 a.badge',
  labelSbs: 'label[for="lay-sbs"]',
  labelTb: 'label[for="lay-tb"]'
};

