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

// The CLI's single entry point (DESIGN.md section 4.1). Everything else in
// src/ is pure and importable without side effects; Node built-ins live
// in bin/callplot.js only.

import { parse as parseDoc } from "./parser.js";
import { plotOn } from "./render/text.js";
import { Out } from "./out.js";
import { picOn } from "./render/pic.js";
import { svgOn } from "./render/svg.js";
import { vmlOn } from "./render/vml.js";
import { graffleOn } from "./render/graffle.js";
import { tableOn } from "./render/table/index.js";
import { buildModel } from "./ir.js";
import { mermaidOn } from "./render/mermaid.js";
import { plantumlOn } from "./render/plantuml.js";
import { pageOn } from "./render/html/page.js";
import { MODES } from "./constants.js";
import { RunContext } from "./context.js";

// parse(text): Flow (Parser.java:37-166 via parser.js)
export function parse(text) {
  return parseDoc(text);
}

// Flow.java:72-82 plus section 3.13: tables are a v5 addition (the 2008
// toolset did this with plottable.sh + Xalan). opts.tableStyle picks the
// style (section 2.3).
export function plotFlow(text, out, mode, ctx = new RunContext(), opts = {}) {
  const f = parse(text);
  f.layout();
  if ((mode & MODES.TABLE) !== 0) {
    tableOn(f, out, mode, opts);
  } else if ((mode & MODES.MERMAID) !== 0) {
    // new output (section 3.10): reads the IR, built after layout()
    mermaidOn(buildModel(f), out);
  } else if ((mode & MODES.PLANTUML) !== 0) {
    plantumlOn(buildModel(f), out);
  } else if ((mode & MODES.HTML) !== 0) {
    // new output (section 3.12): opts picks layout and idPrefix
    pageOn(buildModel(f), out, opts);
  } else if ((mode & (MODES.PIC | MODES.VML | MODES.SVG | MODES.GRAFFLE)) !== 0) {
    pictureFlow(f, out, mode, ctx);
  } else {
    plotOn(f, out, mode);
  }
}

// Section 2.3 public API: whole output as a string, fresh counters by
// default. Throws on any Java throw (leaves no result behind).
export function render(text, mode, ctx = new RunContext(), opts = {}) {
  const out = new Out();
  plotFlow(text, out, mode, ctx, opts);
  return out.toString();
}

// The dispatch inside Flow.java:77-80. Renderer modules land per chunk:
// pic C6, svg C7, vml C8, graffle C9.
export function pictureFlow(f, out, mode, ctx) {
  if ((mode & MODES.GRAFFLE) !== 0) {
    graffleOn(f, out, mode, ctx);
  } else if ((mode & MODES.VML) !== 0) {
    vmlOn(f, out, mode, ctx);
  } else if ((mode & MODES.SVG) !== 0) {
    svgOn(f, out, mode, ctx);
  } else {
    picOn(f, out, mode);
  }
}
