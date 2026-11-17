// @ts-check
// CLI golden runner (section 4.4): spawn the bin/ commands per test/cli/*.json
// case. The 8 W0 cases compare stdout bytes and exit code against
// test/golden/cli/. The rest check exit codes and conditions (chunk W17):
// table styles, bad flags, html layout precedence, plottable usage and
// -debug files, prep stdin, and EPIPE.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CMD = {
  callplot: "bin/callplot.js",
  plottable: "bin/plottable.js",
  prep: "bin/callplot-prep.js"
};

const GOLDEN_CASES = [
  "help_after_file",
  "missing_file",
  "mode_switch",
  "multi_graffle_ids",
  "multi_stagger",
  "no_args",
  "stdin",
  "vxml"
];

// Map bare fixture names to their paths (absolute: some cases run in a temp
// folder); literal paths pass through; a missing name stays missing.
function mapArg(a) {
  if (a === "-" || a.startsWith("-")) {
    return a;
  }
  const fix = "test/fixtures/" + a;
  if (fs.existsSync(fix)) {
    return path.resolve(fix);
  }
  if (fs.existsSync(a)) {
    return path.resolve(a);
  }
  return a; // missing_file case: the name must stay missing
}

function run(cmd, args, stdin) {
  return spawnSync(process.execPath, [path.resolve(CMD[cmd])].concat(args.map(mapArg)), {
    input: stdin ? fs.readFileSync("test/fixtures/" + stdin) : Buffer.from([])
  });
}

function goldenStdout(name) {
  return fs.readFileSync("test/golden/" + name + ".out");
}

for (const json of fs.readdirSync("test/cli")) {
  if (!json.endsWith(".json")) {
    continue;
  }
  const name = json.slice(0, -5);
  const cfg = JSON.parse(fs.readFileSync("test/cli/" + json, "utf8"));
  const cmd = cfg.cmd !== undefined ? cfg.cmd : "callplot";
  const args = cfg.args;
  const stdin = cfg.stdin;

  if (GOLDEN_CASES.includes(name)) {
    test("[cli] " + name, () => {
      const r = run(cmd, args, stdin);
      const golden = "test/golden/cli/" + name;
      assert.equal(Buffer.compare(Buffer.from(r.stdout), fs.readFileSync(golden + ".out")), 0, "stdout bytes");
      assert.equal(r.status, Number(fs.readFileSync(golden + ".exit", "utf8").trim()), "exit code");
    });
    continue;
  }

  switch (name) {
    case "table_default":
      test("[cli] table_default", () => {
        const r = run(cmd, args, stdin);
        assert.equal(Buffer.compare(Buffer.from(r.stdout), goldenStdout("s_fred_annot.table-archtable")), 0, "stdout bytes");
        assert.equal(r.status, 0, "exit code");
      });
      break;

    case "table_bad_style":
      test("[cli] table_bad_style", () => {
        const r = run(cmd, args, stdin);
        assert.equal(r.status, 1, "exit code");
        assert.equal(r.stdout.length, 0, "empty stdout");
      });
      break;

    case "html_bad_layout_file":
      test("[cli] html_bad_layout_file: new_layout_bad must exit 1 via -html", () => {
        const r = run(cmd, args, stdin);
        assert.equal(r.status, 1, "exit code");
        assert.equal(r.stdout.length, 0, "empty stdout (page.js throws before any byte)");
      });
      break;

    case "html_flag_wins":
      test("[cli] html_flag_wins", () => {
        const r = run(cmd, args, stdin);
        assert.equal(r.status, 0, "exit code");
        const html = Buffer.from(r.stdout).toString("utf8");
        assert.equal(html.includes('id="lay-sbs" class="cpf-radio" checked'), true, "sidebyside radio starts checked");
        assert.equal(html.includes('id="lay-tb" class="cpf-radio" checked'), false, "topbottom radio not checked");
      });
      break;

    case "plottable_usage":
      test("[cli] plottable_usage", () => {
        const r = run(cmd, args, stdin);
        assert.equal(Buffer.compare(Buffer.from(r.stdout), fs.readFileSync("test/cli/plottable_usage.expected")), 0, "stdout bytes");
        assert.equal(r.status, 1, "exit code");
      });
      break;

    case "plottable_debug":
      test("[cli] plottable_debug", () => {
        // run it in a temporary folder: the script writes _x_<pid>.xml there
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plottable-"));
        try {
          const r = spawnSync(process.execPath, [path.resolve(CMD[cmd])].concat(args.map(mapArg)), { cwd: dir });
          assert.equal(r.status, 0, "exit code");
          assert.equal(Buffer.compare(Buffer.from(r.stdout), goldenStdout("s_sip_annot.table-htmltable3")), 0, "stdout bytes");
          const xfiles = fs.readdirSync(dir).filter((n) => /^_x_\d+\.xml$/.test(n));
          assert.equal(xfiles.length, 1, "exactly one _x_<pid>.xml");
          assert.equal(Buffer.compare(fs.readFileSync(path.join(dir, xfiles[0])), goldenStdout("s_sip_annot.xml")), 0, "xml file bytes");
          const err = Buffer.from(r.stderr).toString("utf8");
          assert.equal(err.includes("retaining xml intermediate file in _x_"), true, "stderr retaining line");
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
      break;

    case "prep_stdin":
      test("[cli] prep_stdin", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prep-"));
        try {
          const r = spawnSync(process.execPath, [path.resolve(CMD[cmd])].concat(args.map(mapArg)), {
            cwd: dir,
            input: fs.readFileSync("test/fixtures/" + stdin)
          });
          assert.equal(Buffer.compare(Buffer.from(r.stdout), goldenStdout("trace_sip.prep")), 0, "stdout bytes");
          assert.equal(r.status, 0, "exit code");
          assert.equal(fs.readdirSync(dir).includes("debug"), false, "no debug file made (section 3.14.4)");
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
      break;

    case "epipe":
      test("[cli] epipe", () => {
        // the command starts, head reads one line and hangs up the pipe;
        // PIPESTATUS[0] is callplot's own exit code
        const fix = mapArg(args[0]);
        const r = spawnSync("/bin/bash", ["-c",
          `${process.execPath} ${path.resolve(CMD[cmd])} ${fix} | head -n 1; exit \${PIPESTATUS[0]}`]);
        assert.equal(r.status, 0, "exit code");
        assert.equal(r.stderr.length, 0, "empty stderr (no stack trace escaped)");
      });
      break;

    default:
      assert.equal(false, true, "cli case " + name + " has no handler in the W17 runner");
  }
}
