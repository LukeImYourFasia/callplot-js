// Screenshots for the README "Sample output" section (docs/images/*.png).
// Renders the widest tool diagram (docs/diagrams/api.msd, DESIGN section 2.7.3)
// headless with puppeteer (from node_modules, which is not committed). The
// HTML is generated on the spot by the port's own CLI (`bin/callplot.js`), so
// the pictures always show what the tool draws now; no committed page is read.
// Not in lint/typecheck scope (tools/).
//
// Notes:
//  - sidebyside needs the viewport 1100 px or wider: the port's own stylesheet
//    switches layouts inside `@container cpf (min-width:1100px)`; the CLI flag
//    `-html=sidebyside` sets the page radio, the width lets the pane sit.
//  - wordtable re-wraps the page in the screenshot harness only: the legacy
//    Word XML head makes Chrome move the body into <head> (body ends up empty
//    on goto()), so the body region is fed to a blank document here. Only the
//    capture works around Chrome's parser; the tool's own bytes are untouched.
// @ts-check

import puppeteer from "puppeteer";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const PADS = 10; // whitespace trimmed around the content box
const SCALE = 2; // device pixels per CSS pixel: crisp small type

const MSD = "docs/diagrams/api.msd";

// [callplot args, destination, viewport width, viewport height]
const SHOTS = [
  ...["archtable", "htmltable", "htmltable2", "htmltable3", "nolinks", "wordtable"].map(
    (style) => [["-table=" + style, MSD], `docs/images/api-table-${style}.png`, 1600, 900]
  ),
  [["-html", MSD], "docs/images/api-html-topbottom.png", 1500, 1200],
  [["-html=sidebyside", MSD], "docs/images/api-html-sidebyside.png", 1500, 1000]
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

function render(args) {
  const html = execFileSync(process.execPath, ["bin/callplot.js", ...args], {
    maxBuffer: 1 << 26
  }).toString("utf8");
  return html;
}

const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
for (const [args, dst, width, height] of SHOTS) {
  const page = await browser.newPage();
  page.setViewport({ width, height, deviceScaleFactor: SCALE });
  const content0 = render(args);
  let content = content0;
  if (dst.includes("wordtable")) {
    // harness-only rewrap: body region of the Word page into a clean document
    const from = content0.indexOf("<body");
    const to = content0.indexOf("</body>");
    content = `<!doctype html>\n${content0.slice(from, to === -1 ? content0.length : to)}\n`;
  }
  await page.setContent(content, { waitUntil: "networkidle0" });
  const box = await measure(page);
  if (!box) {
    throw new Error(`${dst} drew nothing to capture`);
  }
  await page.screenshot({ path: dst, clip: box, captureBeyondViewport: true });
  const bytes = fs.statSync(dst).size;
  if (bytes < 8000) {
    throw new Error(`${dst} too small (${bytes} bytes): nothing to show off`);
  }
  console.log(`${dst}: ${bytes} bytes (clip ${box.width}x${box.height})`);
}
await browser.close();
