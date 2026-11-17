// Regenerate samples/reference: every output for every sample (DESIGN.md 4.10,
// npm run refs). Compatible outputs come from the oracle: tools/jref.sh for the
// 7 core modes, and the plottable pipeline for the 6 legacy table styles (jref
// -xml, then Xalan over the archive's .xsl files) exactly as tools/gen-golden-extra.sh
// builds goldens. New outputs are byte copies of the approved snapshots under
// test/snapshots. trace_sip has no fixture and no snapshot: its .msd comes from
// the archive's prep.awk (fresh temp dir: the 0.2 awk drops a debug file in the
// cwd, same handling as gen-golden-extra.sh), its 4 new outputs are rendered by
// JS from that msd, and the raw .trace is copied next to it (section 4.10 plus).
// Never touches goldens, snapshots, or the oracle's Java.
// @ts-check

import fs from "node:fs";
import { spawn } from "node:child_process";
import { plotFlow } from "../src/index.js";
import { MODES } from "../src/constants.js";
import { Out } from "../src/out.js";
import { RunContext } from "../src/context.js";

const ROOT = process.cwd();
const LIBDIR = "reference/callplotwithextra/callplot/lib";
const XALAN_CP = `${LIBDIR}/xalan.jar:${LIBDIR}/xml-apis.jar:${LIBDIR}/xercesImpl.jar`;

// 7 core outputs: extension -> jref args. Text mode gets no flag (3.7).
const CORE_MODES = [
  ["txt", []],
  ["pic", ["-pic"]],
  ["xml", ["-xml"]],
  ["vml.html", ["-vml"]],
  ["vxml.html", ["-vxml"]],
  ["svg", ["-svg"]],
  ["graffle", ["-graffle"]]
];
// The port's htmltable is the archive's tmltable.xsl (3.13.2).
const TABLE_STYLES = ["archtable", "htmltable", "htmltable2", "htmltable3", "nolinks", "wordtable"];
const NEW_MODES = [
  ["mmd", MODES.MERMAID, {}],
  ["puml", MODES.PLANTUML, {}],
  ["html-topbottom.html", MODES.HTML, { htmlLayout: "topbottom" }],
  ["html-sidebyside.html", MODES.HTML, { htmlLayout: "sidebyside" }]
];

// sample -> callplot input; fixture -> approved snapshots to copy from.
const SAMPLES = [
  { name: "fred", fixture: "s_fred", input: "samples/fred" },
  { name: "fred2", fixture: "s_fred2", input: "samples/fred2" },
  { name: "fred_annot", fixture: "s_fred_annot", input: "samples/fred_annot" },
  { name: "sip_annot", fixture: "s_sip_annot", input: "samples/sip_annot" },
  // trace_sip: the .msd is made from this .trace by the archive's prep.awk.
  { name: "trace_sip", fixture: null, input: null, trace: "samples/trace_sip.trace" }
];

const ENV = { ...process.env, LC_ALL: "en_US.UTF-8", JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8" };

/** Run one command to completion; @returns {{code, signal, stdout, stderr}}. */
async function exec(name, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(name, args, { ...opts, env: ENV });
    const outChunks = [];
    const errChunks = [];
    child.stdout.on("data", (chunk) => {
      outChunks.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => {
      errChunks.push(Buffer.from(chunk));
    });
    child.on("error", (err) => {
      reject(new Error(`spawn ${name}: ${err.code}`));
    });
    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout: Buffer.concat(outChunks), stderr: Buffer.concat(errChunks) });
    });
  });
}

/** exec plus a loud failure on a non-zero exit; @returns stdout Buffer. */
async function execOk(name, args, what, opts = {}) {
  const r = await exec(name, args, opts);
  if (r.signal !== null || r.code !== 0) {
    throw new Error(`${what}: exit ${r.signal ?? r.code}; stderr: ${r.stderr.toString("utf8")}`);
  }
  return r.stdout;
}

const tmpRoot = fs.mkdtempSync("/tmp/opencode/gen-ref-");
let written = 0;

for (const sample of SAMPLES) {
  const dir = `samples/reference/${sample.name}`;
  fs.mkdirSync(dir, { recursive: true });
  let input = sample.input;

  if (sample.trace) {
    // .msd from awk (section 4.10 plus): fresh temp dir, then compare against
    // the awk prep golden so reference drift fails loudly (4.2 pipeline).
    const tmpd = fs.mkdtempSync(`${tmpRoot}/awk-`);
    const awk = await exec("/usr/bin/awk", ["-f", `${ROOT}/${LIBDIR}/prep.awk`, `${ROOT}/${sample.trace}`], { cwd: tmpd });
    fs.rmSync(tmpd, { recursive: true, force: true });
    if (awk.signal !== null || awk.code !== 0) {
      throw new Error(`prep awk ${sample.name}: exit ${awk.signal ?? awk.code}`);
    }
    const msd = awk.stdout;
    const goldenMsd = fs.readFileSync("test/golden/trace_sip.prep.out");
    if (Buffer.compare(msd, goldenMsd) !== 0) {
      throw new Error("prep drift: awk msd differs from test/golden/trace_sip.prep.out");
    }
    fs.writeFileSync(`${dir}/trace_sip.msd`, msd);
    fs.writeFileSync(`${dir}/trace_sip.trace`, fs.readFileSync(sample.trace));
    input = `${dir}/trace_sip.msd`;
  }

  for (const [ext, flagArgs] of CORE_MODES) {
    const stdout = await execOk("tools/jref.sh", [...flagArgs, input], `jref ${sample.name} ${ext}`);
    fs.writeFileSync(`${dir}/${sample.name}.${ext}`, stdout);
    written += 1;
  }

  // table styles: the plottable pipeline (jref -xml, then Xalan per style).
  const xmlPath = `${tmpRoot}/${sample.name}.xml`;
  const xml = await execOk("tools/jref.sh", ["-xml", input], `jref -xml ${sample.name}`);
  fs.writeFileSync(xmlPath, xml);
  for (const style of TABLE_STYLES) {
    const xsl = style === "htmltable" ? "tmltable.xsl" : `${style}.xsl`;
    const outPath = `${dir}/${sample.name}.table-${style}.html`;
    await execOk("java", ["-cp", XALAN_CP, "org.apache.xalan.xslt.Process", "-IN", xmlPath, "-XSL", `${ROOT}/${LIBDIR}/${xsl}`, "-OUT", outPath], `xalan ${sample.name} ${style}`);
    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, Buffer.alloc(0));
    }
    written += 1;
  }
  fs.rmSync(xmlPath, { force: true });

  for (const [ext, flag, opts] of NEW_MODES) {
    if (sample.fixture !== null) {
      const src = `test/snapshots/${sample.fixture}.${ext}`;
      if (!fs.existsSync(src)) {
        throw new Error(`approved snapshot missing: ${src}`);
      }
      fs.copyFileSync(src, `${dir}/${sample.name}.${ext}`);
    } else {
      // trace_sip has no snapshot: render the new outputs with JS here.
      const out = new Out();
      try {
        plotFlow(fs.readFileSync(input, "utf8"), out, flag, new RunContext(), opts);
      } catch (err) {
        throw new Error(`js render ${sample.name} ${ext}: ${err}`);
      }
      fs.writeFileSync(`${dir}/${sample.name}.${ext}`, Buffer.from(out.toString(), "utf8"));
    }
    written += 1;
  }
}

if (written !== 85) {
  throw new Error(`expected 5 x 17 = 85 outputs, wrote ${written}`);
}

// index.html: a plain page with one table, one row per sample, one column per
// output, each cell a link (4.10 rule 3). fred and fred2 have no numbering, so
// their legacy-table cells are marked "no numbered messages" (4.10 rule 5).
const COLUMNS = [
  ...CORE_MODES.map((c) => c[0]),
  ...TABLE_STYLES.map((s) => `table-${s}.html`),
  ...NEW_MODES.map((m) => m[0])
];
const lines = [];
lines.push("<!doctype html>");
lines.push('<html lang="en">');
lines.push("<head><title>callplot reference samples</title></head>");
lines.push("<body>");
lines.push("<h1>callplot reference samples</h1>");
lines.push("<p>Every output for every sample (section 4.10): 5 samples, 17 outputs each.</p>");
lines.push("<table>");
lines.push("<tr><th>Sample</th>" + COLUMNS.map((c) => `<th>${c}</th>`).join("") + "</tr>");
for (const sample of SAMPLES) {
  const name = sample.name;
  const noRows = name === "fred" || name === "fred2";
  const cells = COLUMNS.map((col) => {
    const file = `${name}/${name}.${col}`;
    let cell = `<a href="${file}">${name}.${col}</a>`;
    if (noRows && col.startsWith("table-")) {
      cell += " (no numbered messages)";
    }
    return `<td>${cell}</td>`;
  });
  lines.push(`<tr><td>${name}</td>` + cells.join("") + "</tr>");
}
lines.push("</table>");
lines.push("</body>");
lines.push("</html>");
fs.writeFileSync("samples/reference/index.html", lines.join("\n") + "\n");

fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log(`wrote 85 outputs + trace_sip.trace + trace_sip.msd + index.html under samples/reference`);
