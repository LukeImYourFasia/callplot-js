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

// TEXT and XML renderers (one plotOn, selected by mode bits).
// Flow.java:315-419 (plotOn), Player.java:99-119 (drawSelf),
// Message.java:126-182 (drawSelf), Message.java:192-224 (printComment).
// One buffer line at a time, exactly like the Java char[].

import { MODES } from "../constants.js";
import { CharBuf, arrAt, fmtI, idiv, parseJavaInt, NumberFormatError } from "../jcompat.js";

// Flow.java:315-419 (prologue/epilogue; the line loop is drawTextLines below)
export function plotOn(f, out, mode) {
  if ((mode & MODES.XML) !== 0) {
    out.println("<plot>"); // Flow.java:318-319
    out.println("<picture>");
  }

  const lines = drawTextLines(f, mode, null); // numbering side effect: myNumber
  for (const l of lines) {
    out.println(l);
  }

  if ((mode & MODES.XML) !== 0) {
    out.println("</picture>"); // Flow.java:401-403
    for (const m of f.messages) {
      printComment(m, out);
    }
    out.println("</plot>");
  }
}

// Flow.java:320-399: the picture-content line loop. Returns the lines instead
// of writing them so the table pipeline (section 3.13.1) can reuse them.
// forceLinks: true forces links on (tables), false forces off, null keeps
// Flow.links. The loop runs startMessageNumbers first, exactly like Java, so
// drawMessage's myNumber assignment is visible to callers.
export function drawTextLines(f, mode, forceLinks) {
  f.startMessageNumbers();
  const links = forceLinks === null ? f.links : forceLinks;

  const width = f.getTotalWidth();
  const buf = new CharBuf(width);
  const lines = [];

  for (let line = 0; line <= f.getTotalHeight(); line++) {
    for (let i = 0; i < width; i++) {
      buf.set(i, " ");
    }

    for (const p of f.players) {
      drawPlayer(f, p, line, buf);
    }
    for (const m of f.messages) {
      drawMessage(f, m, line, buf);
    }

    if (f.shouldPrint(buf)) {
      let lastChar = width - 1;
      while (buf.get(lastChar) === " " && lastChar > 0) {
        lastChar--;
      }

      if ((mode & MODES.XML) !== 0) {
        lines.push(writeLineXml(f, buf, lastChar, links));
      } else {
        lines.push(buf.sliceString(0, lastChar + 1));
      }
    }
  }
  return lines;
}

// Flow.java:359-395: XML-escape and turn (n) into links. Reproduces the
// switch fallthrough: '(' falls to default unless the try block breaks.
function writeLineXml(f, buf, lastChar, links) {
  let s = "";
  let numStart;
  let num;
  for (let i = 0; i <= lastChar; i++) {
    const ch = buf.get(i);
    let wrote = false;
    if (ch === "<") {
      s += "&lt;"; // Flow.java:365
      wrote = true;
    } else if (ch === ">") {
      s += "&gt;"; // Flow.java:369
      wrote = true;
    } else if (ch === "(" && links) {
      numStart = i + 1;
      while (i <= lastChar && buf.get(i) !== ")") {
        i++;
      }
      let linked = false;
      if (buf.get(i) === ")") {
        // buf.get may throw IndexError: Java's lineBuffer[i] would AIOOBE
        try {
          num = parseJavaInt(buf.sliceString(numStart, i - numStart));
          s +=
            "(<a href='#t" + fmtI(num) + "'>" + fmtI(num) + "</a>)<a name='m" + fmtI(num) + "'/>";
          linked = true; // break out of the switch (Flow.java:383)
        } catch (err) {
          if (!(err instanceof NumberFormatError)) {
            throw err; // only NumberFormatError is caught (Flow.java:384)
          }
          // Flow.java:384-385: swallow, fall through to i = numStart - 1
        }
      }
      if (linked) {
        continue;
      }
      i = numStart - 1;
    }
    if (!wrote) {
      s += buf.get(i); // default: Flow.java:392
    }
  }
  return s;
}

// Player.java:99-119
function drawPlayer(f, p, line, buf) {
  let image;
  const lineInCaption = f.labelLine(line);
  if (lineInCaption >= 0) {
    image = lineInCaption < p.caption.length ? p.caption[lineInCaption] : " ";
    // blank = arrayOf(" ") (Player.java:51): one space
  } else {
    image = "|"; // glyph (Player.java:50)
  }
  if (image.length === 1) {
    buf.set(p.column, image[0]);
  } else {
    const bias = idiv(image.length, 2);
    buf.copyIn(image, p.column - bias, image.length);
  }
}

// Message.java:126-182
function drawMessage(f, m, line, buf) {
  const fcol = f.columnOf(m.from);
  const tcol = f.columnOf(m.to);
  const locol = fcol < tcol ? fcol : tcol;
  const hicol = fcol < tcol ? tcol : fcol;

  const offset = m.line - line;

  if (offset === 0 && locol !== hicol) {
    for (let j = locol + 1; j < hicol; j++) {
      buf.set(j, m.filler);
    }
    if ((m.arrowFrom && locol === fcol) || (m.arrowTo && locol === tcol)) {
      buf.set(locol + 1, "<");
    }
    if ((m.arrowFrom && hicol === fcol) || (m.arrowTo && hicol === tcol)) {
      buf.set(hicol - 1, ">");
    }
  } else if (offset === m.caption.length && (locol !== hicol || f.getDoNoteNumbering())) {
    const num = f.nextMessageNumber();
    let finalCaption;
    if (num !== -1) {
      m.myNumber = num;
      finalCaption = "(" + fmtI(num) + ") " + arrAt(m.caption, 0);
    } else {
      finalCaption = arrAt(m.caption, 0);
    }
    copyCaption(buf, locol, finalCaption);
  } else if (offset > 0 && offset <= m.caption.length) {
    const idx = m.caption.length - offset;
    copyCaption(buf, locol, arrAt(m.caption, idx));
  }
}

// Message.java:162-169 and 173-180: clamp the copy, mark truncation with '*'
function copyCaption(buf, locol, text) {
  const width = buf.a.length;
  let copySize = text.length;
  if (locol + 1 + text.length > width) {
    copySize = width - (locol + 1);
  }
  buf.copyIn(text, locol + 1, copySize);
  if (copySize !== text.length) {
    buf.set(width - 1, "*");
  }
}

// Message.java:192-224 (XML epilogue; the Graffle epilogue shares it)
export function printComment(m, out) {
  if (m.myNumber !== 0) {
    out.println("<message>");
    out.println("<number>" + fmtI(m.myNumber) + "</number>");
    out.println("<captions>");
    for (let i = 0; i < m.caption.length; i++) {
      out.println("<caption>" + m.caption[i] + "</caption>");
    }
    out.println("</captions>");
    out.println("<notes>");
    for (const c of m.notes) {
      out.println("<note>");
      out.println(c);
      out.println("</note>");
    }
    out.println("</notes>");
    out.println("<comments>");
    for (const c of m.comments) {
      out.println("<comment>");
      out.println(c);
      out.println("</comment>");
    }
    out.println("</comments>");
    out.println("</message>");
  }
}
