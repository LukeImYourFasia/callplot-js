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

// Parser.java:37-166, ported step by step (section 3.1). Do not "clean it up":
// the quirks in section 3.8 are intentional.

import { javaTrim, javaSplit, IndexError, NullPointerError } from "./jcompat.js";
import { Player, Message } from "./model.js";
import { Flow } from "./flow.js";

// BufferedReader.readLine (section 3.1): a line ends at \n, \r or \r\n. A
// final unterminated line still counts; a trailing terminator adds no extra
// empty line.
function splitLines(text) {
  const lines = [];
  const n = text.length;
  let start = 0;
  let i = 0;
  while (i < n) {
    const ch = text[i];
    if (ch === "\n") {
      lines.push(text.slice(start, i));
      i += 1;
      start = i;
    } else if (ch === "\r") {
      lines.push(text.slice(start, i));
      i += (i + 1 < n && text[i + 1] === "\n") ? 2 : 1;
      start = i;
    } else {
      i += 1;
    }
  }
  if (start < n) {
    lines.push(text.slice(start));
  }
  return lines;
}

// Parser.java:75 regex: split on every / whose preceding char is not \
const SLASH_RE = /(?<=[^\\])\//;

// Java array indexing on the split parts: a missing field throws IndexError.
function at(parts, k) {
  if (k < 0 || k >= parts.length) {
    throw new IndexError("Index out of range");
  }
  return parts[k];
}

export function parse(text) {
  const players = [];
  const messages = [];
  const opts = new Map();
  const f = new Flow(players, messages, opts);

  let lastMsg = null;
  let dummy = false;
  let newDummy = false;

  // section 3.1: 1-based line number of the current raw line (new, for the IR)
  let lineNo = 0;

  for (const line0 of splitLines(text)) {
    let line = line0;
    lineNo += 1;
    const tLine = javaTrim(line); // Parser.java:54

    // Parser.java:56
    if (tLine.startsWith("#") || tLine.length === 0) {
      continue;
    }

    // Parser.java:60-66
    if (tLine.startsWith("!!")) {
      if (lastMsg === null) {
        throw new NullPointerError();
      }
      lastMsg.addNote(tLine.slice(2));
      continue;
    } else if (tLine.startsWith("!")) {
      if (lastMsg === null) {
        throw new NullPointerError();
      }
      lastMsg.addComment(tLine.slice(1));
      continue;
    }

    // Parser.java:69-72: slices the RAW line, not the trimmed line
    if (tLine.startsWith("-")) {
      newDummy = true;
      line = line.slice(1);
    }

    // Parser.java:75
    const splitLineEscaped = javaSplit(line, SLASH_RE);
    // Parser.java:78-83: unescape \/ for all fields except the command
    const parts = splitLineEscaped.map((p, i) =>
      i === 0 ? p : p.replace(/\\\//g, "/"));

    // Parser.java:85: command = splitLine[tkn++]
    const command = at(parts, 0);
    const tkn = { i: 1 }; // mutable index like Java's tkn++
    const next = () => at(parts, tkn.i++);

    if (command === "guy") {
      // Parser.java:86-89
      const name = next();
      const caption = next();
      players.push(new Player(name, caption));
    } else if (command === "note") {
      // Parser.java:90-100
      const from = next();
      if (!dummy && lastMsg !== null) {
        messages.push(lastMsg);
      }
      dummy = newDummy;
      newDummy = false;
      lastMsg = new Message(from, from, next(), " ", false, false);
      lastMsg.srcLine = lineNo;
    } else if (command === "opt") {
      // Parser.java:101-106: values are not trimmed; later put wins
      const name = next();
      const value = next();
      opts.set(name, value);
    } else if (command.indexOf("->") !== -1) {
      // Parser.java:107-132
      const arrowIdx = command.indexOf("->");
      const from = javaTrim(command.slice(0, arrowIdx));
      const to = javaTrim(command.slice(arrowIdx + 2));
      let reply = false;
      while (tkn.i < parts.length) {
        if (!dummy && lastMsg !== null) {
          messages.push(lastMsg);
        }
        dummy = newDummy;
        newDummy = false;
        if (reply) {
          lastMsg = new Message(to, from, next(), "-", false, true);
        } else {
          lastMsg = new Message(from, to, next(), "-", false, true);
        }
        lastMsg.srcLine = lineNo;
        lastMsg.isReply = reply; // set before flipping (section 3.1)
        reply = !reply;
      }
    } else if (command.indexOf("..") !== -1) {
      // Parser.java:133-145: filler '.', no arrows; extra fields ignored
      const dotIdx = command.indexOf("..");
      const from = javaTrim(command.slice(0, dotIdx));
      const to = javaTrim(command.slice(dotIdx + 2));
      if (!dummy && lastMsg !== null) {
        messages.push(lastMsg);
      }
      dummy = newDummy;
      newDummy = false;
      lastMsg = new Message(from, to, next(), ".", false, false);
      lastMsg.srcLine = lineNo;
    } else if (command.indexOf("--") !== -1) {
      // Parser.java:146-159: like .. but repeatLabel=true (filler '.' too)
      const dotIdx = command.indexOf("--");
      const from = javaTrim(command.slice(0, dotIdx));
      const to = javaTrim(command.slice(dotIdx + 2));
      if (!dummy && lastMsg !== null) {
        messages.push(lastMsg);
      }
      dummy = newDummy;
      newDummy = false;
      lastMsg = new Message(from, to, next(), ".", false, false, true);
      lastMsg.srcLine = lineNo;
    }
    // Parser.java:159: anything else: ignore the line, no error
  }

  // Parser.java:161-164
  if (!dummy && lastMsg !== null) {
    messages.push(lastMsg);
  }
  return f;
}
