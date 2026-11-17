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

// Data model for players and messages.
// Player.java:35-97 (fields, ctor, digest); Message.java:35-124 (fields,
// ctors, digest, addComment/addNote, printComment data).
// Captions are stored as JS strings indexed by UTF-16 code unit, like Java
// char[] (section 3.2).

import { tokenize } from "./jcompat.js";

// Shared caption digest (Player.java:74-90, Message.java:72-88).
// StringTokenizer on "^" drops empty tokens; PIC wants caption lines joined
// with quote-space-quote.
function digest(captionRaw) {
  const caption = tokenize(captionRaw, "^");
  let captionString = "";
  for (let i = 0; i < caption.length; i++) {
    if (i !== 0) {
      captionString += "\" \"";
    }
    captionString += caption[i];
  }
  return [caption, captionString];
}

// Player.java:49-56: ctor(Flow, name, caption). column defaults to 10 and is
// assigned by layout() (Flow.java:255-263 via setColumn).
export class Player {
  constructor(name, captionRaw) {
    const [caption, captionString] = digest(captionRaw);
    this.name = name; // alias is NOT trimmed (Parser.java:88)
    this.caption = caption;
    this.captionString = captionString;
    this.column = 10;
  }

  getCaptionLines() {
    return this.caption.length; // Player.java:66-68
  }
}

// Message.java:103-119 ctor + 121-124 getLength + 184-190 addComment/addNote.
// repeatLabel defaults false (Message.java:99-101 delegating ctor).
export class Message {
  constructor(from, to, captionRaw, filler, arrowFrom, arrowTo, repeatLabel = false) {
    const [caption, captionString] = digest(captionRaw);
    this.from = from;
    this.to = to;
    this.caption = caption; // mutable: Graffle mutates caption[0] (section 3.8 #6)
    this.captionString = captionString;
    this.filler = filler; // '-', '.' or ' '
    this.arrowFrom = arrowFrom;
    this.arrowTo = arrowTo;
    this.repeatLabel = repeatLabel;
    this.line = 0; // set by layout (setLine)
    this.myNumber = 0; // Java int default (Message.java:57)
    this.notes = [];
    this.comments = [];
    // New fields for the IR (section 3.1/3.2): 1-based input line that
    // created this message, and the alternating reply flag. Compatible
    // outputs never read them, so they cannot change those outputs.
    this.srcLine = 0;
    this.isReply = false;
  }

  getLength() {
    return this.caption.length;
  }

  addNote(note) {
    this.notes.push(note);
  }

  addComment(comment) {
    this.comments.push(comment);
  }
}

// Derived predicates (section 3.2).
export function isSelf(m) {
  return m.from === m.to;
}
export function isUndirected(m) {
  return !m.arrowFrom && !m.arrowTo;
}
export function isNote(m) {
  return isSelf(m) && isUndirected(m); // made by note/... lines
}
