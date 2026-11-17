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

// VML renderer, also used for -vxml (section 3.4.4, chunk C8).
// Flow.java:514-539 and 579-583 (drawPictureOn VML branches),
// Player.java:149-179 (drawPictureOn VML branch),
// Message.java:680-738 (drawPictureOn VML branch).
// Spacing in the fixed strings is copied from the Java literals; section
// 3.8 #1 says -vxml opens <plot>/<picture> and never closes them, which is
// simply the absence of the closing tags in Java's VML epilogue branch.

import { MODES, VML_TEXT_XOFF, VML_TEXT_YOFF } from "../constants.js";
import { fmtD, fmtI, idiv, parseJavaInt } from "../jcompat.js";
import { isSelf, isUndirected } from "../model.js";
import { arrAt } from "../jcompat.js";

export function vmlOn(f, out, mode, ctx) {
  f.startMessageNumbers();

  if ((mode & MODES.XML) !== 0) {
    out.println("<plot>"); // Flow.java:454-457 (-vxml)
    out.println("<picture>");
  }

  // prologue, Flow.java:514-538
  out.println("<html xmlns:v='urn:schemas-microsoft-com:vml'");
  out.println("xmlns='http://www.w3.org/TR/REC-html40'>");
  out.println("");
  out.println("<head>");
  out.println("");
  out.println("<!--[if !mso]>");
  out.println("<style>");
  out.println("v\\:* {behavior:url(#default#VML);}");
  out.println(".shape {behavior:url(#default#VML);}");
  out.println("</style>");
  out.println("<![endif]-->");
  out.println("");
  out.println("</head>");
  out.println("");
  out.println("<body>");
  f.vmlYSize = f.getTotalHeight() * 2; // Flow.java:530-531
  f.vmlXSize = f.getTotalWidth();
  const vmlYPt = idiv(432 * f.vmlYSize, 100); // Flow.java:532-533
  const vmlXPt = idiv(432 * f.vmlXSize, 100);
  out.println("<!-- totalHeight =" + fmtI(f.getTotalHeight()) + "-->");
  out.println("<!-- totalWidth =" + fmtI(f.getTotalWidth()) + "-->");
  out.println(
    "<v:group style='position:relative;left:1pt;top:2pt;width:" +
      fmtI(vmlXPt) +
      "pt;height:" +
      fmtI(vmlYPt) +
      "pt;' coordsize='" +
      fmtI(f.vmlXSize) +
      "," +
      fmtI(f.vmlYSize) +
      "' >"
  );
  out.println("");

  for (const p of f.players) {
    drawPlayerVml(f, p, out, ctx); // Flow.java:563-566
  }
  for (const m of f.messages) {
    drawMessageVml(f, m, out); // Flow.java:568-571
  }

  // epilogue, Flow.java:579-583: three trailing spaces on the last line
  out.println("");
  out.println("</v:group>");
  out.println("</body>");
  out.println("</html>   ");
}

// Player.java:149-179
function drawPlayerVml(f, p, out, ctx) {
  // all int (section 3.5 rule 1/2): wid prints without a ".0"
  let wid = idiv(f.getColumnPitch() * f.getVMLXSize(), f.getTotalWidth());
  wid = wid * parseJavaInt(f.getVMLBoxWidthPercentage()); // Flow.java:153
  wid = idiv(wid, 100); // Flow.java:154
  const ht = 4.0;
  const stagger = f.getStagger() ? (ht + 2.0) * (ctx.mynum++ % 2.0) : 0.0;
  const ycenter = stagger - ht / 2.0;
  const center = idiv(p.column * f.getVMLXSize(), f.getTotalWidth());

  out.print(
    "<v:rect " +
      f.getVMLBoxStyle() +
      " style='position:absolute;left:" +
      fmtD(center - wid / 2.0) +
      ";top:" +
      fmtD(ycenter - ht / 2.0) +
      ";width:" +
      fmtI(wid) +
      ";height:" +
      fmtD(ht) +
      "'>"
  );
  out.println("  <v:stroke   " + f.getVMLStyle() + " />");
  out.print("</v:rect>");

  out.println(
    " <v:shape fillcolor='black' strokeweight='0pt' coordorigin='0 0' coordsize='100 100' style='position:absolute;top:" +
      fmtD(0.2 + ycenter) +
      ";left:" +
      fmtD(center - wid / 2.0 + 0.3) +
      ";width:" +
      fmtI(wid) +
      ";height:" +
      fmtD(ht) +
      "' path = 'm 0,0 l 100,0  e'>"
  );
  out.println(" <v:path textpathok='True'/> ");
  out.println(
    " <v:textpath on='True' string=\"" +
      f.xmlEscape(arrAt(p.caption, 0)) +
      "\" " +
      f.getVMLBoxTextStyle() +
      "/> "
  );
  out.println(" </v:shape> ");

  out.print(
    "<v:line  from='" +
      fmtD(center) +
      "," +
      fmtD(ycenter - ht / 2.0 + ht) +
      "' to='" +
      fmtD(center) +
      "," +
      fmtI(f.getVMLYSize()) +
      "'>"
  );
  out.println("  <v:stroke " + f.getVMLStyle() + " />");
  out.print("</v:line>");
}

// Message.java:680-738
function drawMessageVml(f, m, out) {
  let Y = idiv(m.line * f.getVMLYSize(), f.getTotalHeight());
  const fromX = idiv(f.columnOf(m.from) * f.getVMLXSize(), f.getTotalWidth());
  const toX = idiv(f.columnOf(m.to) * f.getVMLXSize(), f.getTotalWidth());
  const startX = VML_TEXT_XOFF + (fromX < toX ? fromX : toX);
  const textOff = VML_TEXT_YOFF;

  let xmlCaption = f.xmlEscape(arrAt(m.caption, 0));

  // honor message numbering (Message.java:690-696)
  if (!isSelf(m) || f.getDoNoteNumbering()) {
    const num = f.nextMessageNumber();
    if (num !== -1) {
      m.myNumber = num;
      xmlCaption = "(" + fmtI(num) + ") " + xmlCaption;
    }
  }

  // first line (Message.java:700-707)
  out.println(
    " <v:shape fillcolor='black' strokeweight='0pt' coordorigin='0 0' coordsize='100 100' style='position:absolute;top:" +
      fmtI(Y - textOff) +
      ";left:" +
      fmtI(startX) +
      ";width:1;height:1' path = 'm 0,0 l 100,0  e'>"
  );
  out.println(" <v:path textpathok='True'/> ");
  out.println(
    " <v:textpath on='True' string=\"" + xmlCaption + "\" " + f.getVMLTextStyle() + " /> "
  );
  out.println(" </v:shape> ");

  // other lines (Message.java:710-720): Y moves down per extra caption line
  for (let captionIndex = 1; captionIndex < m.caption.length; captionIndex++) {
    Y += idiv(f.getVMLYSize(), f.getTotalHeight());
    out.println(
      " <v:shape fillcolor='black' strokeweight='0pt' coordorigin='0 0' coordsize='100 100' style='position:absolute;top:" +
        fmtI(Y - textOff) +
        ";left:" +
        fmtI(startX) +
        ";width:1;height:1' path = 'm 0,0 l 100,0  e'>"
    );
    out.println(" <v:path textpathok='True'/> ");
    out.println(
      " <v:textpath on='True' string=\"" +
        f.xmlEscape(arrAt(m.caption, captionIndex)) +
        "\" " +
        f.getVMLTextStyle() +
        " /> "
    );
    out.println(" </v:shape> ");
  }

  // arrows, at the FINAL Y (section 3.8 #5)
  if (isSelf(m)) {
    // Message.java:723-724: nothing to do
  } else if (isUndirected(m)) {
    out.println(
      " <v:line from='" + fmtI(fromX) + "," + fmtI(Y) + "' to='" + fmtI(toX) + "," + fmtI(Y) + "'>"
    );
    out.println("  <v:stroke " + f.getVMLDottedStyle() + "  " + f.getVMLStyle() + " />");
    out.println(" </v:line>");
  } else {
    out.println(
      " <v:line from='" + fmtI(fromX) + "," + fmtI(Y) + "' to='" + fmtI(toX) + "," + fmtI(Y) + "'>"
    );
    out.println("  <v:stroke   " + f.getVMLStyle() + " " + f.getVMLArrowStyle() + " />");
    out.println(" </v:line>");
  }
}
