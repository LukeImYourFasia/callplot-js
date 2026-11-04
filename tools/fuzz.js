// Fuzz runner (DESIGN.md section 4.5): seeded cases through the oracle
// harness pool (4.5.1) and through the JS port, in the 7 core modes.
// Compare stdout bytes and exit codes; when Java exits non-zero, compare
// only the exit code (4.5 rule 5). Save the first 50 diffs as fixtures
// (4.5 rule 6); their goldens come later from tools/gen-golden.sh.
// Timeout: no RESULT in 5 s -> the harness process is SIGKILLed, the case
// records exit 124, and a new process starts (pool.js, 5.3.1 W19e).
// @ts-check

import fs from "node:fs";
import { genCases } from "./oracle/cases.js";
import { runHarnessTasks } from "./oracle/pool.js";
import { plotFlow } from "../src/index.js";
import { MODES } from "../src/constants.js";
import { Out } from "../src/out.js";
import { RunContext } from "../src/context.js";

const CORE_MODES = [
  ["text", "text", MODES.TEXT],
  ["pic", "-pic", MODES.PIC],
  ["xml", "-xml", MODES.XML],
  ["svg", "-svg", MODES.SVG],
  ["vml", "-vml", MODES.VML],
  ["vxml", "-vxml", MODES.VML | MODES.XML],
  ["graffle", "-graffle", MODES.GRAFFLE],
];

/** Run one case through the JS port. A throw models exit 1 (3.7). */
function jsRender(bit, text) {
  const out = new Out();
  try {
    plotFlow(text, out, bit, new RunContext(), {});
    return { exitCode: 0, stdout: Buffer.from(out.toString(), "utf8") };
  } catch {
    return { exitCode: 1, stdout: Buffer.alloc(0) };
  }
}

let seed = null;
let count = null;
const argv = process.argv;
for (let i = 2; i + 1 < argv.length; i += 1) {
  if (argv[i] === "--seed") {
    seed = Number(argv[i + 1]);
  } else if (argv[i] === "--count") {
    count = Number(argv[i + 1]);
  }
}
if (seed === null || count === null || !Number.isInteger(seed) || !Number.isInteger(count) || count < 1) {
  console.error("usage: node tools/fuzz.js --seed <n> --count <n>");
  process.exitCode = 2;
  process.exit(2);
}

const t0 = Date.now();
console.log(`fuzz: seed ${seed}, count ${count}, modes ${CORE_MODES.length}`);

const cases = genCases(seed, count);
const tasks = [];
for (let c = 0; c < cases.length; c += 1) {
  for (const [mode, flag] of CORE_MODES) {
    tasks.push({ key: `${c}.${mode}`, flag, input: cases[c] });
  }
}
const harness = await runHarnessTasks(
  { classDir: "reference/build", mainClass: "com.dynamicsoft.callplot.Main" },
  tasks,
  { clients: 8, timeoutMs: 5000 },
);

// Compare each case x mode: harness oracle vs JS port.
const diffs = [];
const groups = new Map();
for (let c = 0; c < cases.length; c += 1) {
  const text = cases[c].toString("utf8");
  for (const [mode, flag, bit] of CORE_MODES) {
    const h = harness.get(`${c}.${mode}`);
    if (h === undefined) {
      diffs.push({ c, mode, why: "no harness result" });
      continue;
    }
    const j = jsRender(bit, text);
    let why = null;
    if (h.exitCode !== j.exitCode) {
      why = `exit ${h.exitCode} vs js ${j.exitCode}`;
    } else if (h.exitCode === 0 && Buffer.compare(h.stdout, j.stdout) !== 0) {
      const n = Math.min(h.stdout.length, j.stdout.length);
      let b = 0;
      while (b < n && h.stdout[b] === j.stdout[b]) {
        b += 1;
      }
      const head = h.stdout.subarray(0, b).toString("latin1");
      const line = head.split("\n").length;
      why = `byte diff at ${b} (line ${line}, ${h.stdout.length} vs ${j.stdout.length} bytes)`;
    }
    if (why !== null) {
      diffs.push({ c, mode, why });
      const group = `${mode}|${why.split("(")[0].trim()}`;
      groups.set(group, (groups.get(group) ?? 0) + 1);
    }
  }
}

// 4.5 rule 6: save the first 50 diffs as fixtures.
let saved = 0;
if (diffs.length > 0) {
  fs.mkdirSync("test/fixtures/fuzz", { recursive: true });
  for (const d of diffs) {
    if (saved >= 50) {
      break;
    }
    const path = `test/fixtures/fuzz/seed${seed}_case${d.c}`;
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, cases[d.c]);
      saved += 1;
    }
  }
}

const secs = (Date.now() - t0) / 1000;
console.log(`cases: ${count}, runs: ${tasks.length}, diffs: ${diffs.length}, fixtures saved: ${saved}`);
console.log(`time: ${secs.toFixed(1)} s`);
if (diffs.length > 0) {
  console.log("diff groups (mode | first cause | count):");
  for (const [g, n] of [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${g} = ${n}`);
  }
  console.log("first diff cases:");
  for (const d of diffs.slice(0, 20)) {
    console.log(`  case ${d.c} ${d.mode}: ${d.why}`);
  }
  process.exitCode = 1;
}
