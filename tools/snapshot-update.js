// Writes the new-output snapshots (npm run snapshot:update, section 4.7).
// Never marks anything approved: Edgar reviews and approves at milestone
// M3. Re-running only regenerates files that a later change produced.
import fs from "node:fs";
import { Out } from "../src/out.js";
import { plotFlow } from "../src/index.js";
import { MODES } from "../src/constants.js";
import { RunContext } from "../src/context.js";
import { decodeJavaUtf8, javaUtf8Encode } from "../src/jcompat.js";

const NEW_MODES = {
  mermaid: { flag: MODES.MERMAID, ext: "mmd", opts: {} },
  plantuml: { flag: MODES.PLANTUML, ext: "puml", opts: {} },
  htmlTopBottom: { flag: MODES.HTML, ext: "html-topbottom.html", opts: { htmlLayout: "topbottom" } },
  htmlSideBySide: { flag: MODES.HTML, ext: "html-sidebyside.html", opts: { htmlLayout: "sidebyside" } }
};

fs.mkdirSync("test/snapshots", { recursive: true });

let written = 0;
for (const name of fs.readdirSync("test/fixtures")) {
  if (name.endsWith(".trace")) {
    continue;
  }
  for (const m of Object.values(NEW_MODES)) {
    const out = new Out();
    try {
      plotFlow(
        decodeJavaUtf8(fs.readFileSync("test/fixtures/" + name)),
        out,
        m.flag,
        new RunContext(),
        m.opts
      );
    } catch (e) {
      // crashed run: only the bytes that crossed an 8192-byte buffer
      // survive on stdout (same model as the golden runner)
      const full = javaUtf8Encode(out.toString());
      fs.writeFileSync(
        "test/snapshots/" + name + "." + m.ext,
        full.subarray(0, Math.floor(full.length / 8192) * 8192)
      );
      written++;
      continue;
    }
    fs.writeFileSync(
      "test/snapshots/" + name + "." + m.ext,
      javaUtf8Encode(out.toString())
    );
    written++;
  }
}
console.log("wrote " + written + " snapshots to test/snapshots");
