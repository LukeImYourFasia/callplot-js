// @ts-check
// Snapshot tests for the new outputs (section 4.7). The first approved run
// of each new output is stored under test/snapshots; later runs must match
// it byte for byte. The snapshot itself is the oracle (no Java one exists).
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { Out } from "../src/out.js";
import { MODES } from "../src/constants.js";
import { plotFlow } from "../src/index.js";
import { RunContext } from "../src/context.js";

// New modes land per chunk: mermaid W12, plantuml W13, html W14+W15.
const NEW_MODES_DONE = {
  mermaid: { flag: MODES.MERMAID, ext: "mmd", opts: {} },
  plantuml: { flag: MODES.PLANTUML, ext: "puml", opts: {} },
  html_topbottom: { flag: MODES.HTML, ext: "html-topbottom.html", opts: { htmlLayout: "topbottom" } },
  html_sidebyside: { flag: MODES.HTML, ext: "html-sidebyside.html", opts: { htmlLayout: "sidebyside" } }
};

for (const name of fs.readdirSync("test/fixtures")) {
  if (name.endsWith(".trace")) {
    continue; // prep inputs, not callplot inputs
  }
  for (const [modeName, m] of Object.entries(NEW_MODES_DONE)) {
    const snapshot = "test/snapshots/" + name + "." + m.ext;
    test("[snapshot] " + name + " " + modeName, () => {
      if (!fs.existsSync(snapshot)) {
        throw new Error(
          "no snapshot for " + name + " " + modeName + ": run npm run snapshot:update"
        );
      }
      const out = new Out();
      const ctx = new RunContext();
      let thrown = null;
      try {
        plotFlow(fs.readFileSync("test/fixtures/" + name, "utf8"), out, m.flag, ctx, m.opts);
      } catch (e) {
        thrown = e;
      }
      // Same stdout model as the golden runner (section 4.4).
      let got = Buffer.from(out.toString(), "utf8");
      if (thrown !== null) {
        got = got.subarray(0, Math.floor(got.length / 8192) * 8192);
      }
      assert.equal(
        Buffer.compare(got, fs.readFileSync(snapshot)),
        0,
        "snapshot bytes differ"
      );
    });
  }
}
