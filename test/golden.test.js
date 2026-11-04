// @ts-check
// Golden test runner: for each fixture and each supported mode, render through
// the pure core and byte-compare against the goldens from tools/gen-golden.sh.
// Catches exceptions: the core's Out buffer holds partial output exactly like
// a crashing PrintWriter run; exit goldens pin whether a crash must occur.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { Out } from "../src/out.js";
import { MODES } from "../src/constants.js";
import { plotFlow } from "../src/index.js";
import { prep } from "../src/prep/prep.js";
import { RunContext } from "../src/context.js";

// Renderers land per chunk; only modes listed here are compared.
const MODES_DONE = {
  text: MODES.TEXT,
  xml: MODES.XML,
  pic: MODES.PIC,
  svg: MODES.SVG,
  vml: MODES.VML,
  vxml: MODES.VML | MODES.XML,
  graffle: MODES.GRAFFLE,
  "table-archtable": MODES.TABLE,
  "table-htmltable": MODES.TABLE,
  "table-htmltable2": MODES.TABLE,
  "table-htmltable3": MODES.TABLE,
  "table-nolinks": MODES.TABLE,
  "table-wordtable": MODES.TABLE
};

for (const name of fs.readdirSync("test/fixtures")) {
  for (const [modeName, modeFlag] of Object.entries(MODES_DONE)) {
    const golden = "test/golden/" + name + "." + modeName;
    if (!fs.existsSync(golden + ".out")) {
      continue;
    }
    test("[golden] " + name + " " + modeName, () => {
      const out = new Out();
      const ctx = new RunContext();
      let thrown = null;
      const opts =
        modeName.startsWith("table-")
          ? { tableStyle: modeName.slice(6) }
          : {};
      try {
        plotFlow(
          fs.readFileSync("test/fixtures/" + name, "utf8"),
          out,
          modeFlag,
          ctx,
          opts
        );
      } catch (e) {
        thrown = e;
      }
      const got = Buffer.from(out.toString(), "utf8");
      // Model Java stdout: PrintWriter(Buffered) flushes only at 8192-byte
      // boundaries during the run; the final flush is Main's out.close(),
      // which a crashing run never reaches. Hence goldens for crashed runs
      // hold only the bytes that crossed a full buffer.
      const wantExit = fs.readFileSync(golden + ".exit", "utf8").trim();
      let flushed = got;
      if (wantExit !== "0" || thrown !== null) {
        flushed = got.subarray(0, Math.floor(got.length / 8192) * 8192);
      }
      assert.equal(Buffer.compare(flushed, fs.readFileSync(golden + ".out")), 0, "stdout bytes");
      if (wantExit === "0") {
        assert.equal(thrown, null, "expected clean exit, got a throw");
      } else {
        assert.notEqual(thrown, null, "expected exit " + wantExit + ", got a clean run");
      }
    });
  }
}

// Section 3.14: the 4 packet traces through prep, with and without --links
// (awk goldens from gen-golden-extra.sh, mawk 1.3.4).
const PREP_DONE = { prep: false, "prep-links": true };
for (const name of fs.readdirSync("test/fixtures")) {
  if (!name.endsWith(".trace")) {
    continue;
  }
  const base = name.slice(0, -".trace".length);
  for (const [modeName, links] of Object.entries(PREP_DONE)) {
    const golden = "test/golden/" + base + "." + modeName;
    if (!fs.existsSync(golden + ".out")) {
      continue;
    }
    test("[golden] " + base + " " + modeName, () => {
      const r = prep(fs.readFileSync("test/fixtures/" + name, "utf8"), { links });
      assert.equal(
        Buffer.compare(Buffer.from(r.out, "utf8"), fs.readFileSync(golden + ".out")),
        0,
        "prep stdout bytes"
      );
      const wantExit = fs.readFileSync(golden + ".exit", "utf8").trim();
      assert.equal(wantExit, "0", "awk prep never crashes on the fixture traces");
    });
  }
}
