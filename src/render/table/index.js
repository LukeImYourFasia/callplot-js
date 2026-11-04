// @ts-check
/*
 * Copyright (C) 2004 dynamicsoft, Inc.
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public License
 * as published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 * USA
 *
 * Contact information:
 *
 * David Ladd
 * dynamicsoft
 * 600 Lanidex Plaza
 * Parsippany, NJ 07054
 *
 * http://www.dynamicsoft.com
 */

// Section 3.13: the legacy table styles, ported per section 3.13.1. There is
// no XML intermediate (D8): index.js builds the diagram lines and the row
// list from Flow, and one style file writes the same bytes Xalan writes.

import { MODES } from "../../constants.js";
import { drawTextLines } from "../text.js";
import { archtable } from "./archtable.js";
import { htmltable } from "./htmltable.js";
import { htmltable2 } from "./htmltable2.js";
import { htmltable3 } from "./htmltable3.js";
import { nolinks } from "./nolinks.js";
import { wordtable } from "./wordtable.js";

// Xalan parses the callplot -xml stream; malformed input exits 255 in the
// oracle. Section 3.13.4.
export class TableInputError extends Error {}

// Xalan changes the copied link quotes to double (section 3.13.3 rule 3).
function fixLinkQuotes(line) {
  return line
    .replace(/href='#(t\d+)'>/g, 'href="#$1">')
    .replace(/name='(m\d+)'\/>/g, 'name="$1"/>');
}

// A picture line is Xalan-parseable iff every '&' starts an entity: writeLineXml
// already escaped '<' and '>', so only a bare '&' can break the parse.
function checkPictureLine(line) {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "&") {
      if (/^&(?:lt;|gt;|amp;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;)/
        .test(line.slice(i)) === false) {
        throw new TableInputError("picture text contains a bare '&'");
      }
    }
  }
}

// Section 3.13.4 for annotation text: decode the entities (Xalan's parse),
// reject raw '<' and bare '&', then write text per rule 8 (only < > & become
// entities; quotes and everything else stay as is).
export function escapeAnnotated(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "<") {
      throw new TableInputError("annotation text contains raw '<'");
    } else if (c === ">") {
      out += "&gt;";
    } else if (c !== "&") {
      out += c;
    } else {
      const m = /^&(?:lt;|gt;|amp;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;)/
        .exec(text.slice(i));
      if (m === null) {
        throw new TableInputError("annotation text contains a bare '&'");
      }
      let ch;
      if (m[0] === "&lt;") {
        ch = "<";
      } else if (m[0] === "&gt;") {
        ch = ">";
      } else if (m[0] === "&amp;") {
        ch = "&";
      } else if (m[0] === "&quot;") {
        ch = '"';
      } else if (m[0] === "&apos;") {
        ch = "'";
      } else {
        const cp = m[0][2] === "x"
          ? parseInt(m[0].slice(3, -1), 16)
          : parseInt(m[0].slice(2, -1), 10);
        if (Number.isNaN(cp) || cp <= 0 || cp > 0x10ffff) {
          throw new TableInputError("bad character reference " + m[0]);
        }
        ch = String.fromCodePoint(cp);
      }
      out += ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;
      i += m[0].length - 1;
    }
  }
  return out;
}

// mode flag is unused (a table IS the mode); opts.tableStyle picks the style.
export function tableOn(f, out, mode, opts) {
  // Step 1 (3.13.1): the XML line drawing with the file's links option (3.3
  // default on). This also runs the numbering, so myNumber is set. The old
  // port forced links on; the oracle (jref -xml + Xalan) uses the file's
  // value, exposed by trace_sip's opt/links/off (W20 found it).
  const lines = drawTextLines(f, MODES.XML, null);

  // Step 3 (3.13.4): every text node the parser will meet must be well formed.
  const picture = [];
  for (const l of lines) {
    checkPictureLine(l);
    picture.push(fixLinkQuotes(l));
  }

  // Step 2: one row per numbered message, in message order.
  const rows = [];
  for (const m of f.messages) {
    if (m.myNumber !== 0) {
      rows.push({
        num: m.myNumber,
        captions: m.caption.map((c) => escapeAnnotated(c)),
        notes: m.notes.map((c) => escapeAnnotated(c)),
        comments: m.comments.map((c) => escapeAnnotated(c))
      });
    }
  }

  const style = STYLES[opts.tableStyle === undefined ? "archtable" : opts.tableStyle];
  if (style === undefined) {
    throw new TableInputError("unknown table style");
  }
  // Section 3.13.3 rule 2: no line end at the very end of the file.
  out.print(style("<picture>\n" + picture.join("\n") + "\n</picture>", rows));
}

const STYLES = {
  archtable: archtable,
  htmltable: htmltable,
  tmltable: htmltable, // a byte copy of htmltable (section 1.3)
  htmltable2: htmltable2,
  htmltable3: htmltable3,
  nolinks: nolinks,
  wordtable: wordtable
};

// section 3.7 CLI validation reads this list (unknown style: exit 1)
export const TABLE_STYLES = Object.keys(STYLES);
