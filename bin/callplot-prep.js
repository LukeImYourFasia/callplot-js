#!/usr/bin/env node
// @ts-check

// Section 3.14: the callplot-prep command. The awk script prep.awk read a
// packet trace and wrote callplot input; its debug lines went to a literal
// "debug" file. The port writes debug lines only where --debug-file points
// (section 3.14.4, logged in Appendix B).

import fs from "node:fs";
import { prep } from "../src/prep/prep.js";

class EpipeError extends Error {}

// Synchronous writes, as in callplot.js: exitCode must not race pending
// async writes; EPIPE unwinds with exit 0 and empty stderr (section 4.4).
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

function main() {
  let links = false;
  let debugFile;
  let input; // file argument; "-" or absent means stdin

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--links") {
      links = true; // same as LINKS=y in the awk oracle
    } else if (arg === "--debug-file") {
      i++;
      if (i >= args.length) {
        writeAll(2, Buffer.from("callplot-prep: --debug-file needs a path\n", "utf8"));
        process.exitCode = 1;
        return;
      }
      debugFile = args[i];
    } else if (input === undefined) {
      input = arg;
    } else {
      writeAll(2, Buffer.from(`callplot-prep: too many arguments: ${arg}\n`, "utf8"));
      process.exitCode = 1;
      return;
    }
  }

  let text;
  if (input === undefined || input === "-") {
    text = fs.readFileSync(0, "utf8"); // stdin
  } else {
    try {
      text = fs.readFileSync(input, "utf8");
    } catch (err) {
      writeAll(2, Buffer.from(`callplot-prep: Error: ${err.message}\n`, "utf8"));
      process.exitCode = 1;
      return;
    }
  }

  const r = prep(text, { links });
  writeAll(1, Buffer.from(r.out, "utf8"));

  if (debugFile !== undefined) {
    // section 3.14.4: only here do the awk debug lines go to a file
    fs.appendFileSync(debugFile, r.debug.map((line) => line + "\n").join(""), "utf8");
  }
}

try {
  main();
} catch (err) {
  if (!(err instanceof EpipeError)) {
    throw err;
  }
  process.exitCode = 0;
}
