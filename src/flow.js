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

// Flow.java:84-88 ctor, 90-116 option helpers, 118-168 geometry getters,
// 170-212 VML/text getters, 214-247 honorOpts, 249-277 layout, 279-288 columnOf,
// 289-301 numbering. Option order per section 3.3: stagger first because
// other defaults depend on it. All arithmetic is Java int; idiv for division.

import { parseJavaInt, IllegalArgumentError } from "./jcompat.js";

export class Flow {
  constructor(players, messages, opts) {
    this.players = players;
    this.messages = messages;
    this.opts = opts; // Map; later put wins
    this.vmlXSize = 0;  // Flow.java:422 vml_x_size; set by picture renderers
    this.vmlYSize = 0;  // Flow.java:421 vml_y_size
  }

  // Flow.java:90-97. A bad value throws NumberFormatError.
  getIntValueOr(name, dflt) {
    const val = this.opts.get(name);
    if (val !== undefined) {
      return parseJavaInt(val);
    }
    return dflt;
  }

  // Flow.java:99-116. Case-insensitive yes/true/on and no/false/off;
  // anything else throws, like Java's RuntimeException.
  getBooleanValueOr(name, dflt) {
    const val = this.opts.get(name);
    if (val !== undefined) {
      const lc = val.toLowerCase();
      if (lc === "yes" || lc === "true" || lc === "on") {
        return true;
      } else if (lc === "no" || lc === "false" || lc === "off") {
        return false;
      } else {
        throw new Error("Bad value for boolean option");
      }
    }
    return dflt;
  }

  // Flow.java:214-247
  honorOpts() {
    this.stagger = this.getBooleanValueOr("stagger", false);

    this.startLine = this.getIntValueOr("startLine", this.stagger ? 7 : 4);
    this.startColumn = this.getIntValueOr("startColumn", 10);
    this.linePitch = this.getIntValueOr("linePitch", 4);
    if (this.linePitch < 2) {
      this.linePitch = 2;
    }
    this.columnPitch = this.getIntValueOr("columnPitch", 10);
    this.numPlayers = this.players.length;
    this.numMessages = this.messages.length;

    this.crunch = this.getBooleanValueOr("crunch", false);
    this.links = this.getBooleanValueOr("links", true);
    this.topLabel = this.getBooleanValueOr("topLabel", true);
    this.bottomLabel = this.getBooleanValueOr("bottomLabel", false);
    this.doNumbering = this.getBooleanValueOr("messageNumbering", false);
    this.doNoteNumbering = this.getBooleanValueOr("noteNumbering", false);

    this.picXSize = this.optsHas("picXSize") ? this.opts.get("picXSize") : " ";
    this.picYSize = this.optsHas("picYSize") ? this.opts.get("picYSize") : " ";

    this.vmlStyle = this.optsHas("vmlStyle") ? this.opts.get("vmlStyle") : " ";
    this.vmlFont = this.optsHas("vmlFont") ? this.opts.get("vmlFont") : "courier new";
    this.vmlTextSize = this.optsHas("vmlTextSize") ? this.opts.get("vmlTextSize") : "9";
    this.vmlArrowStyle = this.optsHas("vmlArrowStyle") ? this.opts.get("vmlArrowStyle") : "EndArrow='Open'";
    this.vmlDotStyle = this.optsHas("vmlDottedStyle") ? this.opts.get("vmlDottedStyle") : "DashStyle='dot'";
    this.vmlBoxStyle = this.optsHas("vmlBoxStyle") ? this.opts.get("vmlBoxStyle") : "fillcolor='red'";
    this.vmlTextStyle = this.optsHas("vmlTextStyle") ? this.opts.get("vmlTextStyle") : "-";
    this.vmlBoxTextStyle = this.optsHas("vmlBoxTextStyle") ? this.opts.get("vmlBoxTextStyle") : "-";
    this.vmlBoxWidthPercentage = this.optsHas("vmlBoxWidthPercentage")
      ? this.opts.get("vmlBoxWidthPercentage")
      : (this.stagger ? "160" : "90");
  }

  optsHas(name) {
    return this.opts.has(name);
  }

  // Flow.java:249-277
  layout() {
    this.honorOpts();

    this.guyCaptionLines = 0;

    let col = this.startColumn;
    for (const p of this.players) {
      p.column = col;
      col += this.columnPitch;
      if (p.caption.length > this.guyCaptionLines) {
        this.guyCaptionLines = p.caption.length;
      }
    }

    if (this.topLabel) {
      this.startLine += this.guyCaptionLines;
    }

    let line = this.startLine;
    for (const m of this.messages) {
      line += (m.getLength() >= this.linePitch ? m.getLength() + 1 - this.linePitch : 0);
      m.line = line;
      line += this.linePitch;
    }
    this.height = line;
  }

  // Flow.java:118-124
  getStartLine() {
    return this.startLine;
  }
  getLinePitch() {
    return this.linePitch;
  }
  // Flow.java:126-128
  getStartColumn() {
    return this.startColumn;
  }
  // Flow.java:130-132
  getColumnPitch() {
    return this.columnPitch;
  }
  // Flow.java:134-136
  getTotalWidth() {
    return this.numPlayers * this.columnPitch + this.startColumn + this.columnPitch;
  }
  // Flow.java:138-142
  getTotalHeight() {
    return this.height;
  }
  // Flow.java:144-146
  getHeaderHeight() {
    return this.guyCaptionLines;
  }

  // Flow.java:148-156
  labelLine(line) {
    if (this.topLabel && line < this.guyCaptionLines) {
      return line;
    } else if (this.bottomLabel && this.getTotalHeight() - line < this.guyCaptionLines) {
      return this.guyCaptionLines - 1 - (this.getTotalHeight() - line);
    } else {
      return -1;
    }
  }

  // Flow.java:158-168
  getDoNumbering() {
    return this.doNumbering;
  }
  getStagger() {
    return this.stagger;
  }
  getDoNoteNumbering() {
    return this.doNoteNumbering;
  }

  // Flow.java:170-184
  getVMLStyle() {
    return this.vmlStyle;
  }
  getVMLArrowStyle() {
    return this.vmlArrowStyle;
  }
  getVMLDottedStyle() {
    return this.vmlDotStyle;
  }
  getVMLBoxStyle() {
    return this.vmlBoxStyle;
  }

  // Flow.java:186-196. Sentinel "-": build from vmlFont/vmlTextSize.
  getVMLTextStyle() {
    if (this.vmlTextStyle === "-") {
      return "style='FONT-FAMILY:\"" + this.vmlFont + "\";FONT-SIZE:" + this.vmlTextSize + "pt;V-TEXT-ALIGN:left'";
    }
    return this.vmlTextStyle;
  }
  // Flow.java:198-208 (same, center-aligned)
  getVMLBoxTextStyle() {
    if (this.vmlBoxTextStyle === "-") {
      return "style='FONT-FAMILY:\"" + this.vmlFont + "\";FONT-SIZE:" + this.vmlTextSize + "pt;V-TEXT-ALIGN:center'";
    }
    return this.vmlBoxTextStyle;
  }
  // Flow.java:210-212; parsed with parseJavaInt at draw time
  getVMLBoxWidthPercentage() {
    return this.vmlBoxWidthPercentage;
  }

  // Flow.java:424-430
  getVMLXSize() {
    return this.vmlXSize;
  }
  getVMLYSize() {
    return this.vmlYSize;
  }

  // Flow.java:303-305: the method exists but does nothing. Section 3.8 #2.
  xmlEscape(s) {
    return s;
  }

  // Flow.java:279-287: first match wins; lazy call sites decide PIC behavior
  columnOf(name) {
    for (const p of this.players) {
      if (p.name === name) {
        return p.column;
      }
    }
    throw new IllegalArgumentError("no player named " + name);
  }

  // Flow.java:289-301: msgNum resets per render, not per run (section 3.6)
  startMessageNumbers() {
    this.msgNum = 1;
  }
  nextMessageNumber() {
    if (this.getDoNumbering()) {
      return this.msgNum++;
    }
    return -1;
  }

  // Flow.java:432-447: crunch drops lines holding only spaces and bars
  shouldPrint(buf) {
    if (!this.crunch) {
      return true;
    }
    for (const ch of buf.a) {
      if (ch !== " " && ch !== "|") {
        return true;
      }
    }
    return false;
  }
}
