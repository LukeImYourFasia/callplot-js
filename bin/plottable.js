#!/usr/bin/env node
// @ts-check

// Section 3.13.5: the plottable compatibility command, a port of plottable.sh
// from the 2008 archive (which the tests never run, section 4.2). The script
// ran callplot -xml and then Xalan; the port has no XML step (D8) — the table
// is built directly from the model. -debug writes the XML bytes as a side
// output file only.

import fs from "node:fs";
import { plotFlow } from "../src/index.js";
import { MODES } from "../src/constants.js";
import { Out } from "../src/out.js";
import { TABLE_STYLES } from "../src/render/table/index.js";
import { RunContext } from "../src/context.js";

// The script's twelve echo lines, $0 replaced by "plottable" (section 4.4,
// test/cli/plottable_usage.expected). Line 5 ends with one space. Usage goes
// to stdout because the script used echo.
const USAGE = [
  "usage: plottable [-debug] [-style style] {input_file}",
  "",
  "-debug retains the intermediate files for debugging",
  "",
  "The annotations can be added by putting ",
  "one or more lines beginning with ! after the message",
  "",
  "examples:",
  "a->b/MESSAGE",
  "!This is a very interesting message",
  "!Since it's going from a to b",
  "",
];

class EpipeError extends Error {}

// Synchronous writes, as in callplot.js: exitCode must not race pending
// async writes.
function writeAll(fd, buf) {
  let off = 0;
  try {
    while (off < buf.length) {
      off += fs.writeSync(fd, buf, off, buf.length - off);
    }
  } catch (err) {
    if (err.code === "EPIPE") {
      throw new EpipeError("pipe closed");
    }
    throw err;
  }
}

function usage() {
  let s = "";
  for (const line of USAGE) {
    s += line + "\n";
  }
  writeAll(1, Buffer.from(s, "utf8")); // echo, so stdout
}

function errMessage(line) {
  writeAll(2, Buffer.from(line, "utf8"));
}

function main() {
  // the script's positional checks: -debug first if used, then -style
  let args = process.argv.slice(2);
  let doingDebug = false;
  if (args.length > 0 && args[0] === "-debug") {
    doingDebug = true;
    args = args.slice(1);
  }
  let style = "archtable";
  if (args.length > 0 && args[0] === "-style") {
    args = args.slice(1);
    style = args.length > 0 ? args[0] : "";
    args = args.slice(1);
  }

  if (args.length !== 1) {
    usage();
    process.exitCode = 1; // the script's exit 1 after the usage block
    return;
  }
  const file = args[0];

  if (!TABLE_STYLES.includes(style)) {
    // section 3.13.5: unknown style prints an error and exits 1 (the
    // script died inside Xalan, unable to find ${style}.xsl)
    errMessage(`plottable: unknown table style: ${style}\n`);
    process.exitCode = 1;
    return;
  }

  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (err) {
    errMessage(`plottable: Error: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  if (doingDebug) {
    // _x_<pid>.xml in the current folder: the script used the shell $$,
    // here it is the process pid. The XML bytes are a side output only.
    const xmlOut = new Out();
    try {
      plotFlow(text, xmlOut, MODES.XML);
    } catch (err) {
      errMessage(`plottable: ${err.constructor.name}: ${err.message}\n`);
      process.exitCode = 1;
      return;
    }
    const xname = `_x_${process.pid}.xml`;
    fs.writeFileSync(xname, xmlOut.toString(), "utf8");
    errMessage(`retaining xml intermediate file in ${xname}\n`);
  }

  const out = new Out();
  try {
    plotFlow(text, out, MODES.TABLE, new RunContext(), { tableStyle: style });
  } catch (err) {
    errMessage(`plottable: ${err.constructor.name}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  writeAll(1, Buffer.from(out.toString(), "utf8")); // cat ${TMP}
}

try {
  main();
} catch (err) {
  if (!(err instanceof EpipeError)) {
    throw err;
  }
  process.exitCode = 0;
}
