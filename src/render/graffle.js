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

// OmniGraffle renderer (section 3.4.5, chunk C9).
// Flow.java:540-559 and 584-598 (drawPictureOn GRAFFLE branches; messages
// come BEFORE players here),
// Player.java:182-352 (drawPictureOn GRAFFLE branch),
// Message.java:282-678 (drawPictureOn GRAFFLE branch).
// Fixed plist text is copied verbatim from the Java literals, one array
// entry per Java println (section 5.3). Numbers go through fmtI/fmtD.
// Section 3.8 #6 (caption mutation) and #7 (repeatLabel debug to stderr)
// are reproduced on purpose.

import {
  MODES,
  GRAFFLE_MULT,
  GRAFFLE_TOP_MARG,
  GRAFFLE_LINE_TXT_OFST
} from "../constants.js";
import { fmtD, fmtI, idiv, parseJavaInt, arrAt } from "../jcompat.js";
import { isSelf, isUndirected, isNote } from "../model.js";
import { printComment } from "./text.js";

// A run of fixed println lines, copied from Java in order.
function emit(out, lines) {
  for (const s of lines) {
    out.println(s);
  }
}

// Player.java:213-271 (the box style dict)
const PLAYER_STYLE = [
  "<key>Style</key>",
  "<dict>",
  "<key>shadow</key>",
  "<dict>",
  "<key>Draws</key>",
  "<string>YES</string>",
  "</dict>",
  "<key>fill</key>",
  "<dict>",
  "<key>FillType</key>",
  "<integer>3</integer>",
  "<key>GradientCenter</key>",
  "<string>{0.266667, -0.190476}</string>",
  "<key>GradientColor</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.51</string>",
  "<key>b</key>",
  "<string>0.869565</string>",
  "<key>g</key>",
  "<string>0.869565</string>",
  "<key>r</key>",
  "<string>0.869565</string>",
  "</dict>",
  "</dict>",
  "<key>stroke</key>",
  "<dict>",
  "<key>CornerRadius</key>",
  "<real>5</real>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.14</string>",
  "<key>b</key>",
  "<string>0</string>",
  "<key>g</key>",
  "<string>0</string>",
  "<key>r</key>",
  "<string>0</string>",
  "</dict>",
  "</dict>",
  "</dict>",
  "<key>Text</key>",
  "<dict>",
  "<key>Align</key>",
  "<integer>0</integer>",
  "<key>Text</key>"
];

// The RTF header lines (Player.java:281-284, Message.java:485-488).
const RTF_HEAD = [
  "<string>{\\rtf1\\mac\\ansicpg10000\\cocoartf824\\cocoasubrtf110",
  "{\\fonttbl\\f0\\fswiss\\fcharset77 Helvetica;}",
  "{\\colortbl;\\red255\\green255\\blue255;}",
  "\\pard\\tx560\\tx1120\\tx1680\\tx2240\\tx2800\\tx3360\\tx3920\\tx4480\\tx5040\\tx5600\\tx6160\\tx6720\\qc"
];

// Player.java:314-347 (lifeline style plus Tail link)
const PLAYER_LINE_TAIL = [
  "<key>Style</key>",
  "<dict>",
  "<key>stroke</key>",
  "<dict>",
  "<key>Cap</key>",
  "<integer>0</integer>",
  "<key>HeadArrow</key>",
  "<string>0</string>",
  "<key>HeadScale</key>",
  "<real>0.5</real>",
  "<key>TailArrow</key>",
  "<string>0</string>",
  "<key>TailScale</key>",
  "<real>0.5</real>",
  "</dict>",
  "</dict>",
  "<key>Tail</key>",
  "<dict>",
  "<key>ID</key>"
];

// Message.java:310-314 (group wrapper head; its tail carries an id and so
// stays inline in drawMessageGraffle)
const GROUP_HEAD = [
  "<dict>",
  "<key>Class</key>",
  "<string>Group</string>",
  "<key>Graphics</key>",
  "<array>"
];

// Message.java:349-426 (note text box style)
const NOTE_STYLE = [
  "<key>Style</key>",
  "<dict>",
  "<key>fill</key>",
  "<dict>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.72</string>",
  "<key>b</key>",
  "<string>0.804798</string>",
  "<key>g</key>",
  "<string>1</string>",
  "<key>r</key>",
  "<string>1</string>",
  "</dict>",
  "</dict>",
  "<key>shadow</key>",
  "<dict>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.21</string>",
  "<key>b</key>",
  "<string>0</string>",
  "<key>g</key>",
  "<string>0</string>",
  "<key>r</key>",
  "<string>0</string>",
  "</dict>",
  "<key>Fuzziness</key>",
  "<real>9.0033035278320312</real>",
  "<key>ShadowVector</key>",
  "<string>{0, 2}</string>",
  "</dict>",
  "<key>stroke</key>",
  "<dict>",
  "<key>Cap</key>",
  "<integer>0</integer>",
  "<key>CornerRadius</key>",
  "<real>7</real>",
  "<key>Width</key>",
  "<string>2</string>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.8</string>",
  "<key>b</key>",
  "<string>0</string>",
  "<key>g</key>",
  "<string>0.95</string>",
  "<key>r</key>",
  "<string>0.95</string>",
  "</dict>",
  "</dict>",
  "</dict>"
];

// Message.java:431-473 (non-note text box style)
const TEXT_STYLE = [
  "<key>Style</key>",
  "<dict>",
  "<key>fill</key>",
  "<dict>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.42</string>",
  "<key>b</key>",
  "<string>1</string>",
  "<key>g</key>",
  "<string>1</string>",
  "<key>r</key>",
  "<string>1</string>",
  "</dict>",
  "</dict>",
  "<key>shadow</key>",
  "<dict>",
  "<key>Draws</key>",
  "<string>NO</string>",
  "</dict>",
  "<key>stroke</key>",
  "<dict>",
  "<key>Cap</key>",
  "<integer>0</integer>",
  "<key>CornerRadius</key>",
  "<real>7</real>",
  "<key>Draws</key>",
  "<string>NO</string>",
  "</dict>",
  "</dict>"
];

// Message.java:550-576 (shadow block, only inside a note's line style)
const LINE_NOTE_SHADOW = [
  "<key>shadow</key>",
  "<dict>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.26</string>",
  "<key>b</key>",
  "<string>0</string>",
  "<key>g</key>",
  "<string>0</string>",
  "<key>r</key>",
  "<string>0</string>",
  "</dict>",
  "<key>Fuzziness</key>",
  "<real>6</real>",
  "<key>ShadowVector</key>",
  "<string>{0, 1}</string>",
  "<key>Draws</key>",
  "<string>YES</string>",
  "</dict>"
];

// Message.java:611-628 (width+color, only inside a note's stroke dict)
const LINE_NOTE_STYLE = [
  "<key>Width</key>",
  "<string>2</string>",
  "<key>Color</key>",
  "<dict>",
  "<key>a</key>",
  "<string>0.8</string>",
  "<key>b</key>",
  "<string>0</string>",
  "<key>g</key>",
  "<string>0.95</string>",
  "<key>r</key>",
  "<string>0.95</string>",
  "</dict>"
];

export function graffleOn(f, out, mode, ctx) {
  f.startMessageNumbers();

  if ((mode & MODES.XML) !== 0) {
    out.println("<plot>"); // Flow.java:454-457
    out.println("<picture>");
  }

  // prologue, Flow.java:540-546
  out.println('<?xml version="1.0" encoding="UTF-8"?>');
  out.println(
    '<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" ' +
      '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
  );
  out.println('<plist version="1.0">');
  out.println("<dict>");
  out.println("<key>GraphicsList</key>");
  out.println("<array>");

  f.vmlYSize = f.getTotalHeight(); // Flow.java:548-549 (H, not 2H)
  f.vmlXSize = f.getTotalWidth();

  // messages first (Flow.java:551-554), then players (556-559)
  for (const m of f.messages) {
    drawMessageGraffle(f, m, out, ctx);
  }
  for (const p of f.players) {
    drawPlayerGraffle(f, p, out, ctx);
  }

  // epilogue, Flow.java:584-598
  out.println("</array>");
  out.println("</dict>");
  out.println("</plist>");

  if ((mode & MODES.XML) !== 0) {
    out.println("</picture>");
    for (const m of f.messages) {
      printComment(m, out);
    }
    out.println("</plot>");
  }
}

// Player.java:182-352
function drawPlayerGraffle(f, p, out, ctx) {
  const pct = parseJavaInt(f.getVMLBoxWidthPercentage()); // Player.java:185
  const wid = (GRAFFLE_MULT * f.getColumnPitch() * pct) / 100.0;
  const ht = 1.6 * p.caption.length * GRAFFLE_MULT; // keep this operator order
  const stagger = f.getStagger() ? (ht + 2.0) * (ctx.mynum++ % 2.0) : 0.0;
  const ycenter = (stagger * GRAFFLE_MULT + GRAFFLE_TOP_MARG) / 2.0;
  const center = idiv(p.column * f.getVMLXSize() * GRAFFLE_MULT, f.getTotalWidth());

  // text box, Player.java:194-200
  out.println("<dict>");
  out.println("<key>Bounds</key>"); // Player.java:197
  out.println(
    "<string>{{" +
      fmtD(center - wid / 2.0) +
      ", " +
      fmtD(ycenter - ht / 2.0) +
      " }, {" +
      fmtD(wid) +
      ", " +
      fmtD(ht) +
      "}}</string>"
  );
  out.println("<key>Class</key>");
  out.println("<string>ShapedGraphic</string>");
  out.println("<key>FitText</key>");
  out.println("<string>NO</string>");
  out.println("<key>ID</key>");
  ctx.playerId += 1; // Player.java:207: int textId = ++id
  const textId = ctx.playerId;
  out.println("<integer>" + fmtI(ctx.playerId) + "</integer>"); // Player.java:208

  // Player.java:210-281
  out.println("<key>Shape</key>");
  out.println("<string>Rectangle</string>");
  emit(out, PLAYER_STYLE);

  // Player.java:285-291 (RTF text; caption[i] where i == caption.length - 1
  // throws IndexError when there is no caption line, section 3.8)
  emit(out, RTF_HEAD); // Player.java:281-284
  out.print("\\f0\\fs24 \\cf0 ");
  for (let i = 0; i < p.caption.length - 1; i++) {
    out.println(p.caption[i] + "\\");
  }
  out.println(arrAt(p.caption, p.caption.length - 1) + "}</string>");

  // Player.java:292-295
  out.println("</dict>");
  out.println("</dict>");

  // lifeline, Player.java:298-307
  out.println("<dict>");
  out.println("<key>Class</key>");
  out.println("<string>LineGraphic</string>");
  out.println("<key>ID</key>");
  ctx.playerId += 1; // Player.java:304: ++id
  out.println("<integer>" + fmtI(ctx.playerId) + "</integer>");
  out.println("<key>Points</key>");
  out.println("<array>");
  out.println(
    "<string>{" + fmtD(center) + ", " + fmtD(ycenter - ht / 2.0 + ht) + "}</string>"
  );
  out.println(
    "<string>{" +
      fmtD(center) +
      ", " +
      fmtI(GRAFFLE_TOP_MARG + f.getVMLYSize() * GRAFFLE_MULT) +
      "}</string>"
  );
  out.println("</array>");

  // Player.java:314-346
  emit(out, PLAYER_LINE_TAIL);
  out.println("<integer>" + fmtI(textId) + "</integer>"); // Player.java:346
  out.println("</dict>");
  out.println("</dict>"); // Player.java:350
}

// Message.java:282-678. One message = an OmniGraffle group holding the
// label text box(es) and the arrow line. Quirks kept on purpose: repeatLabel
// debug lines go to stderr (section 3.8 #7), caption[0] gains the "N. "
// numbering prefix and stays visible in the epilogue comments (section 3.8
// #6), textId refers to the FIRST text box only, and numColumns can divide
// down to 0 so a message draws its line with no label box at all.
function drawMessageGraffle(f, m, out, ctx) {
  const linePos = m.line * GRAFFLE_MULT + GRAFFLE_TOP_MARG;
  const fx = f.columnOf(m.from) * GRAFFLE_MULT;
  const tx = f.columnOf(m.to) * GRAFFLE_MULT;
  const startx = fx < tx ? fx : tx;
  let numColumns = 1;
  if (m.repeatLabel) {
    numColumns =
      idiv(Math.abs(f.columnOf(m.from) - f.columnOf(m.to)), f.getColumnPitch());
    ctx.err.println(
      "startx " + fmtI(startx) + "  numColumns " + fmtI(numColumns)
    ); // Message.java:292
  }

  // honor message numbering (Message.java:297-307); the caption mutation
  // (section 3.8 #6) prepends "N. " to line 0 and survives to the comments
  if (!isNote(m) || f.getDoNoteNumbering()) {
    const num = f.nextMessageNumber();
    if (num !== -1) {
      m.myNumber = num;
      m.caption[0] = fmtI(num) + ". " + arrAt(m.caption, 0);
    }
  }

  // group wrapper (Message.java:310-314)
  emit(out, GROUP_HEAD);

  const textId = ctx.messageId; // Message.java:317: int textId = id
  let curX = startx; // Message.java:318 (int curX)
  let textx = curX; // Message.java:320 (double textx = curX)
  const texty =
    -1 * GRAFFLE_MULT * m.caption.length + GRAFFLE_LINE_TXT_OFST + linePos;

  for (let i = 0; i < numColumns; i++) {
    textx = curX + 10; // Message.java:326 (offset for arrow)

    out.println("<dict>");
    out.println("<key>Bounds</key>");
    out.println(
      "<string>{{" + fmtD(textx) + ", " + fmtD(texty) + " }, {0, 0}}</string>"
    ); // Message.java:331-332; the 0s are ints in Java
    out.println("<key>Class</key>");
    out.println("<string>ShapedGraphic</string>");
    out.println("<key>FitText</key>");
    out.println("<string>YES</string>");
    out.println("<key>ID</key>");
    out.println("<integer>" + fmtI(ctx.messageId++) + "</integer>"); // 341
    out.println("<key>Shape</key>");
    out.println("<string>Rectangle</string>");

    if (isNote(m)) {
      emit(out, NOTE_STYLE); // Message.java:349-426
    } else {
      emit(out, TEXT_STYLE); // Message.java:431-473
    }

    // RTF label body (Message.java:478-499; empty caption throws, 3.8)
    out.println("<key>Text</key>");
    out.println("<dict>");
    out.println("<key>Align</key>");
    out.println("<integer>0</integer>");
    out.println("<key>Text</key>");
    emit(out, RTF_HEAD); // Message.java:485-488
    out.print("\\f0\\fs24 \\cf0 ");
    let j;
    for (j = 0; j < m.caption.length - 1; j++) {
      out.println(m.caption[j] + "\\");
    }
    out.println(arrAt(m.caption, j) + "}</string>");
    out.println("<key>VerticalPad</key>");
    out.println("<integer>1</integer>");
    out.println("</dict>");
    out.println("</dict>"); // Message.java:501

    curX += f.getColumnPitch() * GRAFFLE_MULT; // Message.java:503
  }
  // end of text

  // the arrow line (Message.java:511-542)
  out.println("<dict>");
  out.println("<key>Class</key>");
  out.println("<string>LineGraphic</string>");
  out.println("<key>ID</key>");
  out.println("<integer>" + fmtI(ctx.messageId++) + "</integer>");
  out.println("<key>Points</key>");
  out.println("<array>");
  if (isSelf(m) && !isUndirected(m)) {
    // self-directed: five-point hook; the doubles print with a ".0"
    out.println(
      "<string>{" + fmtI(fx) + ", " + fmtD(texty - 5) + "}</string>"
    );
    out.println(
      "<string>{" + fmtI(fx + 20) + ", " + fmtD(texty - 10) + "}</string>"
    );
    out.println(
      "<string>{" +
        fmtI(fx + 30) +
        ", " +
        fmtD((texty + linePos) / 2) +
        "}</string>"
    );
    out.println(
      "<string>{" + fmtI(fx + 20) + ", " + fmtI(linePos + 10) + "}</string>"
    );
    out.println(
      "<string>{" + fmtI(fx) + ", " + fmtI(linePos + 5) + "}</string>"
    );
  } else if (isNote(m)) {
    out.println(
      "<string>{" + fmtD(textx) + ", " + fmtD(texty) + "}</string>"
    ); // textx is Java's double
    out.println(
      "<string>{" + fmtI(tx) + ", " + fmtI(linePos) + "}</string>"
    );
  } else {
    out.println(
      "<string>{" + fmtI(fx) + ", " + fmtI(linePos) + "}</string>"
    );
    out.println("<string>{" + fmtI(tx) + ", " + fmtI(linePos) + "}</string>");
  }
  out.println("</array>");

  // line style (Message.java:544-654)
  out.println("<key>Style</key>");
  out.println("<dict>");
  if (isNote(m)) {
    emit(out, LINE_NOTE_SHADOW); // Message.java:550-576
  }
  out.println("<key>stroke</key>");
  out.println("<dict>");
  out.println("<key>HeadArrow</key>");
  if (m.arrowTo && !m.arrowFrom) {
    out.println("<string>FilledArrow</string>");
    out.println("<key>HeadScale</key>");
    out.println("<real>0.75</real>");
  } else {
    out.println("<string>0</string>");
    out.println("<key>HeadScale</key>");
    out.println("<real>0.5</real>");
  }
  if (!isSelf(m) && isUndirected(m)) {
    // ".." long dash vs "--" short dash (Message.java:598/602)
    out.println("<key>Pattern</key>");
    out.println(m.repeatLabel ? "<integer>2</integer>" : "<integer>1</integer>");
  }
  if (isNote(m)) {
    emit(out, LINE_NOTE_STYLE); // Message.java:611-628
  }
  out.println("<key>TailArrow</key>");
  if (m.arrowFrom && !m.arrowTo) {
    out.println("<string>FilledArrow</string>");
    out.println("<key>TailScale</key>");
    out.println("<real>0.75</real>");
  } else {
    out.println("<string>0</string>");
    out.println("<key>TailScale</key>");
    out.println("<real>0.5</real>");
  }
  if (isSelf(m)) {
    out.println("<key>LineType</key>");
    out.println("<integer>1</integer>"); // Message.java:648-649
  }
  out.println("</dict>");
  out.println("</dict>");

  // a note links its line to the text box (Message.java:657-668)
  if (isNote(m)) {
    out.println("<key>Tail</key>");
    out.println("<dict>");
    out.println("<key>ID</key>");
    out.println("<integer>" + fmtI(textId) + "</integer>");
    out.println("</dict>");
  }
  out.println("</dict>"); // Message.java:670 (close LineGraphic)

  // end group wrapper (Message.java:674-677)
  out.println("</array>");
  out.println("<key>ID</key>");
  out.println("<integer>" + fmtI(ctx.messageId++) + "</integer>");
  out.println("</dict>");
}
