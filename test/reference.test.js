// @ts-check
// Reference-sample tests (DESIGN.md 4.10 rule 4): render each sample with JS
// and byte-compare against each stored file under samples/reference. The 13
// legacy outputs were made by the Java oracle (jref, plus Xalan for the table
// styles), so they also pin the JS port against Java; the 4 new outputs pin JS
// against the approved snapshots. trace_sip's new outputs were rendered by JS
// in tools/gen-reference.js (it has no fixture and no snapshot).
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { Out } from "../src/out.js";
import { MODES } from "../src/constants.js";
import { plotFlow } from "../src/index.js";
import { RunContext } from "../src/context.js";

// The 17 outputs per sample (4.10 table): extension -> mode + options.
const REFERENCE_MODES = [
  { ext: "txt", flag: MODES.TEXT, opts: {} },
  { ext: "pic", flag: MODES.PIC, opts: {} },
  { ext: "xml", flag: MODES.XML, opts: {} },
  { ext: "vml.html", flag: MODES.VML, opts: {} },
  { ext: "vxml.html", flag: MODES.VML | MODES.XML, opts: {} },
  { ext: "svg", flag: MODES.SVG, opts: {} },
  { ext: "graffle", flag: MODES.GRAFFLE, opts: {} },
  { ext: "table-archtable.html", flag: MODES.TABLE, opts: { tableStyle: "archtable" } },
  { ext: "table-htmltable.html", flag: MODES.TABLE, opts: { tableStyle: "htmltable" } },
  { ext: "table-htmltable2.html", flag: MODES.TABLE, opts: { tableStyle: "htmltable2" } },
  { ext: "table-htmltable3.html", flag: MODES.TABLE, opts: { tableStyle: "htmltable3" } },
  { ext: "table-nolinks.html", flag: MODES.TABLE, opts: { tableStyle: "nolinks" } },
  { ext: "table-wordtable.html", flag: MODES.TABLE, opts: { tableStyle: "wordtable" } },
  { ext: "mmd", flag: MODES.MERMAID, opts: {} },
  { ext: "puml", flag: MODES.PLANTUML, opts: {} },
  { ext: "html-topbottom.html", flag: MODES.HTML, opts: { htmlLayout: "topbottom" } },
  { ext: "html-sidebyside.html", flag: MODES.HTML, opts: { htmlLayout: "sidebyside" } }
];

// sample -> callplot input. trace_sip's input is the stored .msd that tools/gen-reference.js
// made from samples/trace_sip.trace with the archive's prep.awk (4.10).
const SAMPLES = [
  { name: "fred", input: "samples/fred" },
  { name: "fred2", input: "samples/fred2" },
  { name: "fred_annot", input: "samples/fred_annot" },
  { name: "sip_annot", input: "samples/sip_annot" },
  { name: "trace_sip", input: "samples/reference/trace_sip/trace_sip.msd" }
];

for (const s of SAMPLES) {
  for (const m of REFERENCE_MODES) {
    const stored = `samples/reference/${s.name}/${s.name}.${m.ext}`;
    test("[golden] " + s.name + " " + m.ext, () => {
      if (!fs.existsSync(stored)) {
        throw new Error("no reference output " + stored + ": run npm run refs");
      }
      const out = new Out();
      const ctx = new RunContext();
      let thrown = null;
      try {
        plotFlow(fs.readFileSync(s.input, "utf8"), out, m.flag, ctx, m.opts);
      } catch (e) {
        thrown = e;
      }
      // Reference samples are valid inputs: a clean render is required.
      assert.equal(thrown, null, "reference samples must render cleanly");
      assert.equal(
        Buffer.compare(Buffer.from(out.toString(), "utf8"), fs.readFileSync(stored)),
        0,
        "reference bytes differ"
      );
    });
  }
}

// trace_sip extras (4.10 "plus"): the stored .msd is the awk prep output, and
// the stored .trace is the sample input copied unchanged.
test("[golden] trace_sip msd", () => {
  assert.equal(
    Buffer.compare(
      fs.readFileSync("samples/reference/trace_sip/trace_sip.msd"),
      fs.readFileSync("test/golden/trace_sip.prep.out")
    ),
    0,
    "reference msd must equal the awk prep golden"
  );
});
test("[golden] trace_sip trace", () => {
  assert.equal(
    Buffer.compare(
      fs.readFileSync("samples/reference/trace_sip/trace_sip.trace"),
      fs.readFileSync("samples/trace_sip.trace")
    ),
    0,
    "stored trace must equal the sample input"
  );
});
