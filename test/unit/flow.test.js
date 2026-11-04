// @ts-check
// Unit tests for options + layout (sections 3.3, 3.4.0).
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { parse } from "../../src/parser.js";

function laidOut(name) {
  const f = parse(fs.readFileSync("test/fixtures/" + name, "utf8"));
  f.layout();
  return f;
}

test("[unit] s_fred layout: W=55, H=29, message lines 5..25 step 4", () => {
  const f = laidOut("s_fred");
  assert.equal(f.getTotalWidth(), 55);
  assert.equal(f.getTotalHeight(), 29);
  assert.deepEqual(f.messages.map(m => m.line), [5, 9, 13, 17, 21, 25]);
  assert.deepEqual(f.players.map(p => p.column), [10, 25]); // pitch 15
});

test("[unit] fred2 layout: G=3, startLine 7, H=31", () => {
  const f = laidOut("s_fred2");
  assert.equal(f.getHeaderHeight(), 3);
  assert.deepEqual(f.messages.map(m => m.line), [7, 11, 15, 19, 23, 27]);
  assert.equal(f.getTotalHeight(), 31);
  assert.equal(f.getTotalWidth(), 55);
});

test("[unit] tall_caption: caption length >= linePitch shifts later lines", () => {
  const f = laidOut("tall_caption"); // linePitch 2 -> 5-line caption: +4
  // player a=5 lines (G=5) -> startLine 4+5=9; one msg (len 1) at line 9;
  // height 9+2=11
  assert.deepEqual(f.messages.map(m => m.line), [9]);
  assert.equal(f.getTotalHeight(), 11);
});

test("[unit] linePitch clamps below 2", () => {
  const f = laidOut("pitch_clamp"); // linePitch 1 -> 2
  assert.equal(f.linePitch, 2);
});

test("[unit] option errors: bad_bool throws, bad_int throws NumberFormatError", () => {
  const badBool = parse(fs.readFileSync("test/fixtures/bad_bool", "utf8"));
  assert.throws(() => badBool.layout(), /Bad value for boolean option/);
  const badInt = parse(fs.readFileSync("test/fixtures/bad_int", "utf8"));
  assert.throws(() => badInt.layout(), /For input string/);
});

test("[unit] stagger drives defaults: startLine 7 and width percentage 160", () => {
  const f = laidOut("stagger");
  assert.equal(f.stagger, true);
  assert.equal(f.getStartLine(), 8); // 7 (stagger default) + G (1)
  assert.equal(f.vmlBoxWidthPercentage, "160");
});

test("[unit] labels: labelLine top and bottom indexes", () => {
  const f = laidOut("labels_both"); // G=3, top+bottom
  assert.equal(f.labelLine(0), 0);
  assert.equal(f.labelLine(2), 2);
  assert.equal(f.labelLine(3), -1);
  const H = f.getTotalHeight();
  assert.equal(f.labelLine(H - 1), 1);
  assert.equal(f.labelLine(H - 2), 0);
  assert.equal(f.labelLine(H - 3), -1);
});

test("[unit] labels_none: no top or bottom labels anywhere", () => {
  const f = laidOut("labels_none");
  for (let y = 0; y <= f.getTotalHeight(); y++) {
    assert.equal(f.labelLine(y), -1);
  }
});

test("[unit] columnOf: first match wins; unknown throws IllegalArgumentError", () => {
  const f = laidOut("dup_alias"); // two players named a
  assert.equal(f.columnOf("a"), f.players[0].column);
  const g = laidOut("s_fred");
  assert.equal(g.columnOf("b"), 25);
  assert.throws(() => g.columnOf("z"), /no player named z/);
});

test("[unit] nextMessageNumber: -1 without numbering; 1,2,3... with it", () => {
  const plain = laidOut("s_fred");
  assert.equal(plain.nextMessageNumber(), -1);
  const numbered = laidOut("s_fred_annot");
  numbered.startMessageNumbers(); // renders call this first (Flow.java:317/451)
  assert.equal(numbered.nextMessageNumber(), 1);
  assert.equal(numbered.nextMessageNumber(), 2);
  assert.equal(numbered.nextMessageNumber(), 3);
  numbered.startMessageNumbers(); // per-render reset
  assert.equal(numbered.nextMessageNumber(), 1);
});

test("[unit] start_overrides: startLine 0 + topLabel keeps G; startColumn 20", () => {
  const f = laidOut("start_overrides");
  assert.equal(f.startColumn, 20);
  assert.equal(f.startLine, 1); // 0 + G(1)
  assert.deepEqual(f.messages.map(m => m.line), [1, 5]);
  assert.equal(f.getTotalHeight(), 9); // 5 + 4
  assert.equal(f.getTotalWidth(), 50); // 2*10 + 20 + 10
});

test("[unit] vmlTextStyle sentinel builds from font+size; literal overrides", () => {
  const dflt = laidOut("s_fred");
  assert.equal(dflt.getVMLTextStyle(), "style='FONT-FAMILY:\"courier new\";FONT-SIZE:9pt;V-TEXT-ALIGN:left'");
  assert.equal(dflt.getVMLBoxTextStyle(), "style='FONT-FAMILY:\"courier new\";FONT-SIZE:9pt;V-TEXT-ALIGN:center'");
  const vml = laidOut("vml_styles");
  assert.equal(vml.getVMLTextStyle(), "FONT-FAMILY:Custom;FONT-SIZE:8pt");
  assert.equal(vml.vmlFont, "Impact"); // vmlFont is a field; Java has no getter
});
