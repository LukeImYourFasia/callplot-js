// Screenshots for the README "Sample output" section (docs/images/*.png).
// Renders committed HTML outputs headless with puppeteer (from node_modules,
// which is not committed). Rerun after regenerating samples (`npm run refs`
// first). Not in lint/typecheck scope (tools/).
//
// Notes:
//  - sidebyside is captured at width 1500: the port's own stylesheet switches
//    layouts inside `@container cpf (min-width:1100px)`, so a narrower window
//    stacks the panes (that is what a browser does at that width too).
//  - wordtable re-wraps the page in the screenshot harness only: the legacy
//    Word XML head makes Chrome move the body into <head> (body ends up empty
//    on goto()), so the body region is fed to a blank document here. The
//    committed bytes are untouched and golden-verified; only the capture works
//    around Chrome's parser.
// @ts-check

import puppeteer from "puppeteer";
import fs from "node:fs";

const PADS = 10; // whitespace trimmed around the content box
const SCALE = 2; // device pixels per CSS pixel: crisp small type

// [source, destination, viewport width, viewport height]
const SHOTS = [
  ...["archtable", "htmltable", "htmltable2", "htmltable3", "nolinks", "wordtable"].map((style) => [
    `samples/reference/fred_annot/fred_annot.table-${style}.html`,
    `docs/images/fred_annot-table-${style}.png`,
    1000,
    760
  ]),
  ["samples/reference/sip_annot/sip_annot.html-topbottom.html", "docs/images/sip_annot-html-topbottom.png", 860, 1400],
  ["samples/reference/sip_annot/sip_annot.html-sidebyside.html", "docs/images/sip_annot-html-sidebyside.png", 1500, 1000]
];

fs.mkdirSync("docs/images", { recursive: true });

// Elements whose union bounds the interesting content: the ASCII diagram
// (<pre>) and the event table, or the whole callplot page (.cpf).
const BOX_SELECTOR = ".cpf,pre,table";

function measure(page) {
  return page.evaluate(`(() => {
    let l = Infinity, t = Infinity, r = 0, b = 0;
    for (const el of document.querySelectorAll("${BOX_SELECTOR}")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      l = Math.min(l, rect.left); t = Math.min(t, rect.top);
      r = Math.max(r, rect.right); b = Math.max(b, rect.bottom);
    }
    if (l === Infinity) return null;
    return { x: Math.max(0, Math.floor(l) - ${PADS}), y: Math.max(0, Math.floor(t) - ${PADS}),
             width: Math.ceil(r - l) + ${PADS} * 2, height: Math.ceil(b - t) + ${PADS} * 2 };
  })()`);
}

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
for (const [src, dst, width, height] of SHOTS) {
  const page = await browser.newPage();
  page.setViewport({ width, height, deviceScaleFactor: SCALE });
  if (src.endsWith("wordtable.html")) {
    // harness-only rewrap: body region of the Word page into a clean document
    const raw = fs.readFileSync(src, "utf8");
    const from = raw.indexOf("<body");
    const to = raw.indexOf("</body>");
    const body = raw.slice(from, to === -1 ? raw.length : to);
    await page.setContent(`<!doctype html>\n${body}\n`, { waitUntil: "networkidle0" });
  } else {
    await page.goto(`file://${process.cwd()}/${src}`, { waitUntil: "networkidle0" });
  }
  const box = await measure(page);
  if (!box) {
    throw new Error(`${src} drew nothing to capture`);
  }
  await page.screenshot({ path: dst, clip: box, captureBeyondViewport: true });
  const bytes = fs.statSync(dst).size;
  if (bytes < 8000) {
    throw new Error(`${dst} too small (${bytes} bytes): nothing to show off`);
  }
  console.log(`${dst}: ${bytes} bytes (clip ${box.width}x${box.height})`);
}
await browser.close();
