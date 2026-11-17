// @ts-check
// Section 4.7/4.2 "syntax": mmdc on every Mermaid snapshot, java -jar
// plantuml.jar -checkonly on every PlantUML snapshot. Empty snapshots are
// the crashing fixtures' flushed output (never anything a parser could
// read): skipped, counted. Exit 0 means every non-empty snapshot was
// accepted. Only tools/ starts these processes (section 2.6 #6.19):
// execFile/spawn with argument arrays, never a built shell string.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MMD_BIN = path.resolve("node_modules/@mermaid-js/mermaid-cli/src/cli.js");
const MMD_CFG = "tools/mmdc-puppeteer.json"; // --no-sandbox: headless fd check only
const PLANTUML_JAR = "reference/plantuml.jar";
const OUT_DIR = "/tmp/opencode/syntax";
fs.mkdirSync(OUT_DIR, { recursive: true });

const snapshots = fs.readdirSync("test/snapshots");
let ok = 0;
let skipped = 0;
const failures = [];

for (const name of snapshots) {
  if (name.endsWith(".mmd")) {
    if (fs.statSync("test/snapshots/" + name).size === 0) {
      skipped++;
      continue;
    }
    const r = spawnSync(process.execPath, [MMD_BIN, "-i", "test/snapshots/" + name, "-o", OUT_DIR + "/" + name.replace(/\.mmd$/, ".svg"), "-p", MMD_CFG]);
    if (r.status !== 0) {
      failures.push(name + " mmdc: " + r.stderr.toString("utf8").trim().split("\n")[0]);
    } else {
      ok++;
    }
  } else if (name.endsWith(".puml")) {
    if (fs.statSync("test/snapshots/" + name).size === 0) {
      skipped++;
      continue;
    }
    const r = spawnSync("java", ["-jar", PLANTUML_JAR, "-checkonly", "test/snapshots/" + name]);
    if (r.status !== 0) {
      failures.push(name + " plantuml: " + r.stderr.toString("utf8").trim());
    } else {
      ok++;
    }
  }
}

for (const line of failures) {
  console.log("SYNTAX FAIL " + line);
}
console.log("syntax: " + ok + " accepted, " + skipped + " empty skipped");
process.exit(failures.length === 0 ? 0 : 1);
