// Trust check (DESIGN.md 4.5.1): 300 fuzz cases (seed 99) x 7 core modes
// through both one-JVM-per-run jref.sh and the harness pool. Stdout bytes
// and exit codes must be equal for every run; when Java exits non-zero,
// compare only the exit code (4.5 rule 5). Records the run time of each
// path in the report. npm run fuzz:check-oracle
// @ts-check

import fs from "node:fs";
import { genCases } from "./cases.js";
import { runHarnessTasks } from "./pool.js";
import { spawn } from "node:child_process";

const MODES = [
  ["text", "text"],
  ["pic", "-pic"],
  ["xml", "-xml"],
  ["svg", "-svg"],
  ["vml", "-vml"],
  ["vxml", "-vxml"],
  ["graffle", "-graffle"],
];

function argNum(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
}

const seed = argNum("--seed", 99);
const count = argNum("--count", 300);
console.log(`trust check: seed ${seed}, cases ${count}, modes 7`);

const cases = genCases(seed, count);
const tasks = [];
for (let c = 0; c < cases.length; c += 1) {
  for (const [mode, flag] of MODES) {
    // Case ids are one token in the frame header: no spaces.
    tasks.push({ key: `${c}.${mode}`, flag, input: cases[c] });
  }
}

const ENV = { ...process.env, LC_ALL: "en_US.UTF-8", JAVA_TOOL_OPTIONS: "-Dfile.encoding=UTF-8" };

// --- harness path ---
const t0 = Date.now();
const harnessResults = await runHarnessTasks(
  { classDir: "reference/build", mainClass: "com.dynamicsoft.callplot.Main" },
  tasks,
  { clients: 8, timeoutMs: 5000 },
);
const harnessSec = (Date.now() - t0) / 1000;

// --- one JVM per run path (jref.sh) ---
const tmpDir = fs.mkdtempSync("/tmp/opencode/oracle-check-");

async function runJref(args) {
  return new Promise((resolve) => {
    const child = spawn("tools/jref.sh", args, { env: ENV });
    const chunks = [];
    let killed = false;
    child.stdout.on("data", (chunk) => {
      chunks.push(chunk);
    });
    child.on("error", (err) => {
      resolve({ code: -1, stderr: `spawn failed: ${err.code}` });
    });
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, 30000);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout: Buffer.concat(chunks), killed });
    });
  });
}

const t1 = Date.now();
const jrefResults = new Map();
{
  const queue = tasks.map((task, i) => ({ task, path: `${tmpDir}/${String(i).padStart(5, "0")}.in` }));
  const cursor = [0];
  async function workerJ() {
    while (cursor[0] < queue.length) {
      const item = queue[cursor[0]];
      cursor[0] += 1;
      fs.writeFileSync(item.path, item.task.input);
      const args = item.task.flag === "text" ? [item.path] : [item.task.flag, item.path];
      jrefResults.set(item.task.key, await runJref(args));
    }
  }
  const jobs = [];
  for (let i = 0; i < 12; i += 1) {
    jobs.push(workerJ());
  }
  await Promise.all(jobs);
}
fs.rmSync(tmpDir, { recursive: true });
const jrefSec = (Date.now() - t1) / 1000;

// --- compare ---
let diffs = 0;
const shown = [];
for (const { key } of tasks) {
  const h = harnessResults.get(key);
  const j = jrefResults.get(key);
  const jCode = j.killed ? 124 : (j.code !== null ? j.code : (j.signal !== null ? 124 : -1));
  let ok = jCode === h.exitCode;
  if (ok && h.exitCode === 0 && jCode === 0) {
    ok = Buffer.compare(h.stdout, j.stdout) === 0;
  }
  if (!ok && shown.length < 20) {
    shown.push(key);
  }
  if (!ok) {
    diffs += 1;
  }
}

console.log(`runs: ${tasks.length}`);
console.log(`harness path: ${harnessSec.toFixed(1)} s`);
console.log(`jref path: ${jrefSec.toFixed(1)} s (${(jrefSec / tasks.length * 1000).toFixed(0)} ms/run)`);
console.log(`diffs: ${diffs}${shown.length > 0 ? " first: " + shown.join(", ") : ""}`);
if (diffs > 0) {
  console.log("TRUST CHECK FAIL — do not use the harness (4.5.1)");
  process.exitCode = 1;
} else {
  console.log("TRUST CHECK PASS");
}
