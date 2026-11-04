#!/usr/bin/env node
// @ts-check

// CLI driver: port of Main.java:37-76 (arg loop and flush policy) and
// Main.java:78-159 (usage). Node built-ins are confined to this file; the
// core under src/ stays pure (DESIGN.md section 4.6, criterion 5).

import fs from "node:fs";
import { plotFlow } from "../src/index.js";
import { MODES } from "../src/constants.js";
import { Out } from "../src/out.js";
import { TABLE_STYLES as tableStyles } from "../src/render/table/index.js";
import { RunContext } from "../src/context.js";

// Main.java:78-159. Verbatim from the Java source, including the stale
// option defaults in the help text: bug-compatible, do not modernize.
const USAGE = [
  "Usage: callplot [-?|--help] [-pic|-vml|-svg|-xml|-graffle] {-|file}",
  "",
  " -? --help: print this help",
  " -pic: format output for pic(1), not as ASCII-art.",
  " -svg: format output as Scalable Vector Graphics",
  " -vml: format output as Vector Markup Language for IE and MS Office.",
  " -xml: format output as XML.",
  " -vxml: format output as XML, but with a VML plot.",
  " -graffle: format output as OmniGraffle v5 XML.",
  "",
  "File Format:",
  "opt/name/value          // set option 'name' to value 'value'",
  "",
  "guy/alias/label         // declare an entity with nickname 'alias' and label 'label'",
  "",
  "x->y/Caption            // declare a message from the entity with nickname 'x' to ",
  "                        // the entity with nickname 'y' with the label 'caption'",
  "                        // to include forward slashes, escape them (e.g. '\\/')",
  "",
  "x->y/cap1/cap2          // declare a message from the entity with nickname 'x' to ",
  "                        // the entity with nickname 'y' with the label 'cap1'",
  "                        // followed by a response in the reverse direction with",
  "                        // caption 'cap2'",
  "",
  "x..y/Caption            // draw an undirected dotted line from the entity with ",
  "                        // nickname 'x' to the entity with nickname 'y' with ",
  "                        // the label 'caption'",
  "",
  "x--y/Caption            // draw an undirected dotted line from the entity with ",
  "                        // nickname 'x' to the entity with nickname 'y' with ",
  "                        // the label 'caption' shown for each entity line in graffle format",
  "",
  "note/x/Text             // Draw the text to the right of the line for entity 'x'",
  "",
  "The captions and note test can be broken across lines with ^",
  "(caret). In this case, the last line is drawn above the arrow, the",
  "next to last line above that, and so on.",
  "",
  "These are the options that exist now:",
  "",
  "opt/startLine/{integer}            // initial line # for messages",
  "",
  "opt/startColumn/{integer}          // leftmost column for entities",
  "",
  "opt/linePitch/{integer}            // # of lines between messages",
  "",
  "opt/columnPitch/{integer}          // # of cols between entities",
  "",
  "opt/topLabel/{boolean}             // label entities at top?",
  "",
  "opt/bottomLabel/{boolean}          // label entities at bottom?",
  "",
  "opt/messageNumbering/{boolean}     // number messages in '(#) text' format?",
  "",
  "opt/noteNumbering/{boolean}        // number notes as well as messages?",
  "",
  "opt/crunch/{boolean}               // elide lines that would have been just space and ",
  "\t\t\t\t   // vertical bars (ascii-art only)",
  "opt/stagger/{boolean}               // stagger the boxes to allow longer labels ",
  "",
  "opt/vmlStyle/{string}\t\t   // re-define the line style for VML output",
  "default:: Weight='2pt'",
  "",
  "opt/vmlArrowStyle/{string}         // re-define the arrow style for VML output",
  "default: EndArrow='Open'",
  "",
  "opt/vmlDottedStyle/{string}\t   // re-define the dotted line style for VML output",
  "default: DashStyle='dot'",
  "",
  "opt/vmlTextStyle/{string}\t   // re-define the text style for VML output",
  "default: style='font:normal normal normal 9pt Courier'",
  "",
  "opt/vmlBoxStyle/{string}\t   // re-define the style applied to the rectangle",
  "default: fillcolor='red'\t   // at the top of each column ",
  "",
  "opt/vmlBoxWidthPercentage/{integer} // re-define the %-age of the column filled by ",
  "default: 85\t\t\t    // the rectangle at the top of a column",
  "",
  "boolean options accept 'on', 'true' and 'yes' as meaning true, and their opposites as false.",
  "",
  // Section 3.7: one block listing the new flags after the verbatim text.
  // Tests never compare stderr, so this addition is safe.
  "New flags in this port:",
  "",
  " -table: format output as one of the legacy plottable tables.",
  " -table=<style>: pick the style: archtable htmltable tmltable htmltable2 htmltable3 nolinks wordtable.",
  " -mermaid: format output as Mermaid sequence-diagram text.",
  " -plantuml: format output as PlantUML sequence-diagram text.",
  " -html: format output as a self-contained HTML page (layout from opt/htmlLayout, else topbottom).",
  " -html=<layout>: force the page layout: topbottom or sidebyside.",
];

// Synchronous fd writes (not process.stdout/stderr): exit() must not race
// pending async writes, which would truncate output and kill us (SIGPIPE
// style status -1). Node main.java's PrintWriter+flush reaches the fd
// synchronously before System.exit.
// EPIPE unwinds the run with a sentinel; the entry point maps it to exit 0
// with empty stderr (section 4.4 epipe case).
class EpipeError extends Error {}

function writeAll(fd, buf) {
  let off = 0;
  try {
    while (off < buf.length) {
      off += fs.writeSync(fd, buf, off, buf.length - off);
    }
  } catch (err) {
    if (err.code === "EPIPE") {
      // Section 4.4 epipe case: the reader hung up the pipe. Die silently
      // with exit 0 and empty stderr, like a tool stopped by a closed pipe.
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
  writeAll(2, Buffer.from(s, "utf8")); // System.err.println
}

// Java: PrintWriter out = new PrintWriter(System.out) (Main.java:72) wraps a
// BufferedWriter with an 8192-byte buffer; only whole buffer-loads of bytes
// leave the process before out.flush() (Main.java:74). A crashed JVM never
// reaches the final flush, so the buffer tail is lost.
function emit(out, crashed) {
  const bytes = Buffer.from(out.toString(), "utf8");
  writeAll(1, crashed ? bytes.subarray(0, Math.floor(bytes.length / 8192) * 8192) : bytes);
}

const args = process.argv.slice(2);

// Section 3.13/3.12 opts carried to the renderers; one per run, set by the
// -table and -html flags. Like mode, values set by a flag affect only the
// files after it (the flag writes them when it is read).
const opts = {};

function main() {
  if (args.length === 0) {
    usage(); // Main.java:41-44
    process.exitCode = 1;
    return;
  }

  let mode = MODES.TEXT;
  const ctx = new RunContext(); // section 3.6: statics persist across files
  for (const arg of args) {
    if (arg === "-pic") {
      mode = MODES.PIC; // Main.java:46-47
      continue;
    } else if (arg === "-xml") {
      mode = MODES.XML;
      continue;
    } else if (arg === "-vml") {
      mode = MODES.VML;
      continue;
    } else if (arg === "-svg") {
      mode = MODES.SVG;
      continue;
    } else if (arg === "-vxml") {
      mode = MODES.VML | MODES.XML;
      continue;
    } else if (arg === "-graffle") {
      mode = MODES.GRAFFLE;
      continue;
    } else if (arg === "-table") {
      mode = MODES.TABLE; // v5 section 3.13: the table mode
      opts.tableStyle = "archtable";
      continue;
    } else if (arg.startsWith("-table=")) {
      mode = MODES.TABLE;
      const style = arg.slice("-table=".length);
      if (!tableStyles.includes(style)) {
        // section 3.7: an unknown style is a CLI error, printed and exit 1
        writeAll(2, Buffer.from(`callplot: unknown table style: ${style}\n`, "utf8"));
        process.exitCode = 1;
        return;
      }
      opts.tableStyle = style;
      continue;
    } else if (arg === "-mermaid") {
      mode = MODES.MERMAID; // v5 section 3.10
      continue;
    } else if (arg === "-plantuml") {
      mode = MODES.PLANTUML; // v5 section 3.11
      continue;
    } else if (arg === "-html") {
      mode = MODES.HTML; // v5 section 3.12: layout from the input file
      opts.htmlLayout = undefined;
      continue;
    } else if (arg.startsWith("-html=")) {
      mode = MODES.HTML;
      const layout = arg.slice("-html=".length);
      if (layout !== "topbottom" && layout !== "sidebyside") {
        writeAll(2, Buffer.from(`callplot: unknown html layout: ${layout}\n`, "utf8"));
        process.exitCode = 1;
        return;
      }
      opts.htmlLayout = layout; // the flag forces the layout (section 3.12.6)
      continue;
    } else if (arg === "-?" || arg === "--help") {
      usage(); // Main.java:64-66: exits 0 at this point
      return;
    }
    let text;
    if (arg === "-") {
      text = fs.readFileSync(0, "utf8"); // Main.java:67-68 (stdin)
    } else {
      try {
        text = fs.readFileSync(arg, "utf8"); // Main.java:69-70 (FileReader)
      } catch (err) {
        // section 3.7: an unreadable file also gives exit 1
        writeAll(2, Buffer.from(`callplot: Error: ${err.message}\n`, "utf8"));
        process.exitCode = 1;
        return;
      }
    }
    const out = new Out(); // Main.java:72: fresh PrintWriter per file
    let crashed = false;
    try {
      plotFlow(text, out, mode, ctx, opts); // Flow.java:72-82 via index.js
    } catch (err) {
      crashed = true; // Main has no catch: the JVM would unwind and exit 1
      // section 3.7: the port names the error on stderr instead of dumping
      // a JVM stack trace; the tests never compare stderr
      writeAll(2, Buffer.from(`callplot: ${err.constructor.name}: ${err.message}\n`, "utf8"));
    }
    emit(out, crashed); // Main.java:74: out.flush()
    if (crashed) {
      process.exitCode = 1;
      return;
    }
  }
}

// EPIPE anywhere: exit 0 silently, nothing on stderr (section 4.4 epipe).
try {
  main();
} catch (err) {
  if (!(err instanceof EpipeError)) {
    throw err;
  }
  process.exitCode = 0;
}
