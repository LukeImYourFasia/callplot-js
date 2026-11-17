// @ts-check
// Section 3.12.4: layout unit tests — the pitch rule (label floor, event
// floor, round + clamp), lifeline positions, band heights, and the SVG
// width/height formulas. Expected values are hand-computed from the
// section's constants (CW=7.5 LABW=7.6 LH=16 M=28 TOP=16, pitch 150..300).
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { parse } from "../../src/parser.js";
import { buildModel } from "../../src/ir.js";
import { computeLayout } from "../../src/render/html/layout.js";

function laidOut(name) {
  const f = parse(fs.readFileSync("test/fixtures/" + name, "utf8"));
  f.layout();
  return f;
}

test("[unit] html layout: default pitch 150, X(i) = M + pitch/2 + i*pitch", () => {
  const model = buildModel(laidOut("s_fred")); // Fred, Barney; spans all 1
  const L = computeLayout(model);
  assert.equal(L.pitch, 150); // 6*7.6+36 = 81.6 label floor, no span floor
  assert.deepEqual(L.x, [103, 253]); // 28 + 75 + i*150
});

test("[unit] html layout: label floor is clamped then rounded (40 chars)", () => {
  const text = [
    "guy/A/12345678901234567890123456789012345678", // 40 chars
    "guy/B/B",
    "A->B/msg"
  ].join("\n");
  const f = parse(text);
  f.layout();
  const L = computeLayout(buildModel(f));
  // 40*7.6+36 = 340 -> min(round(340), 300) = 300
  assert.equal(L.pitch, 300);
  assert.deepEqual(L.x, [178, 478]); // 28 + 150 + i*300
});

test("[unit] html layout: label floor rounds half-up under the clamp (34 chars)", () => {
  const text = [
    "guy/A/1234567890123456789012345678901234", // 34 chars
    "guy/B/B",
    "A->B/msg"
  ].join("\n");
  const f = parse(text);
  f.layout();
  const L = computeLayout(buildModel(f));
  // 34*7.6+36 = 294.4 -> round -> 294
  assert.equal(L.pitch, 294);
  assert.deepEqual(L.x, [175, 469]); // 28 + 147 + i*294
});

test("[unit] html layout: event floor capW/span + 24 only applies to span >= 2", () => {
  const text = [
    "opt/messageNumbering/on",
    "guy/A/A",
    "guy/B/B",
    "guy/C/C",
    "A->C/" + "x".repeat(100) // num: capW 778; span 2: 778/2+24 = 413 -> 300
  ].join("\n");
  const f = parse(text);
  f.layout();
  const L = computeLayout(buildModel(f));
  assert.equal(L.pitch, 300);
  // same input without numbering: capW 756 -> 756/2+24 = 402 -> still 300
  const text2 = text.replace("opt/messageNumbering/on\n", "");
  const g = parse(text2);
  g.layout();
  assert.equal(computeLayout(buildModel(g)).pitch, 300);
});

test("[unit] html layout: capW number room 28 changes pitch (span 3, 100 chars)", () => {
  const base = [
    "guy/A/A",
    "guy/B/B",
    "guy/C/C",
    "guy/D/D",
    "A->D/" + "x".repeat(100)
  ].join("\n");
  const f = parse("opt/messageNumbering/on\n" + base);
  f.layout();
  const on = computeLayout(buildModel(f)).pitch;
  const g = parse(base);
  g.layout();
  const off = computeLayout(buildModel(g)).pitch;
  // numbered: 778/3+24 = 283.33 -> 283; plain: 756/3+24 = 276
  assert.equal(on, 283);
  assert.equal(off, 276);
});

test("[unit] html layout: sip_annot geometry (3 players 2-line labels, 15 events)", () => {
  const model = buildModel(laidOut("s_sip_annot"));
  const L = computeLayout(model);
  assert.equal(L.pitch, 150);
  assert.deepEqual(L.x, [103, 253, 403]);
  // labels are Alice/UA, Proxy, Bob/UA: 2 lines -> boxH 14+2*16 = 46
  assert.equal(L.boxH, 46);
  assert.equal(L.top0, 92); // 16 + 46 + 30
  // bands: 2-line captions give 2*16+30=62 (events 1,3,7,8,12,13),
  // 1-line give 46, self gives 16+38=54
  const hs = L.events.map((b) => b.h);
  assert.deepEqual(hs, [62, 46, 62, 46, 46, 46, 62, 62, 46, 46, 54, 46, 46, 46, 46]);
  assert.equal(hs.reduce((a, b) => a + b, 0), 762);
  assert.equal(L.events[0].top, 92);
  assert.equal(L.events[1].top, 154); // 92 + 62
  // note "Phone rings" (11) on b: 403+12+82.5+16 = 513.5 -> +28 = 541.5
  // lifelines: 56 + 3*150 = 506 -> W = 541.5
  assert.equal(L.W, 541.5);
  assert.equal(L.H, 92 + 762 + 12); // last bottom + 12
  assert.deepEqual(L.capLens, [6, 10, 6, 11, 11, 11, 6, 6, 3, 10, 10, 3, 6, 3, 6]);
});

test("[unit] html layout: zero events -> H = top0 + 12, W = 2M + n*pitch", () => {
  const f = parse("guy/A/A\n");
  f.layout();
  const L = computeLayout(buildModel(f));
  assert.equal(L.top0, 76);
  assert.equal(L.H, 88);
  assert.equal(L.W, 2 * 28 + 150);
  assert.deepEqual(L.events, []);
});

test("[unit] html layout: empty input -> no players, W = 2M", () => {
  const f = parse(fs.readFileSync("test/fixtures/empty", "utf8"));
  f.layout();
  const L = computeLayout(buildModel(f));
  assert.deepEqual(L.x, []);
  assert.equal(L.W, 56);
  assert.equal(L.boxH, 30); // label line count floors at 1
});
