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
 * License along with this library; if not, write it to the Free Software
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

// Section 3.12.2 + 3.12.6: the whole -html page as one self-contained file,
// no JavaScript, nothing loaded from the network. The page structure is the
// contract in section 3.12.2; the two layouts come from the hidden radio
// switch, and the chosen option only decides which radio starts checked.

import { IllegalArgumentError } from "../../jcompat.js";
import { escHtml } from "../../escape.js";
import { CSS } from "./style.js";
import { svgOn } from "./svg.js";
import { tableOn } from "./table.js";
import { Out } from "../../out.js";

/** @typedef {{ htmlLayout: string|undefined, title: string|undefined }} HtmlOptions */

// Layout choice, section 3.12.6 order: API option, then input file line,
// then topbottom. A bad value from either throws before any byte is out.
function pickLayout(model, opts) {
  const raw = opts.htmlLayout !== undefined ? opts.htmlLayout : model.options.htmlLayout;
  if (raw === undefined) {
    return "topbottom";
  }
  if (raw === "topbottom" || raw === "sidebyside") {
    return raw;
  }
  throw new IllegalArgumentError("Bad value for htmlLayout option");
}

export function pageOn(model, out, opts = {}) {
  const layout = pickLayout(model, opts);
  const prefix = opts.idPrefix !== undefined ? opts.idPrefix : "";
  const titleRaw = opts.title !== undefined ? opts.title : model.title;
  const title = titleRaw !== undefined ? titleRaw : "Call flow";
  const escTitle = escHtml(title);

  out.println("<!doctype html>");
  out.println('<html lang="en">');
  out.println("<head>");
  out.println('<meta charset="utf-8">');
  out.println('<meta name="viewport" content="width=device-width, initial-scale=1">');
  out.println(`<title>${escTitle}</title>`);
  out.println("<style>");
  out.println(CSS);
  out.println("</style>");
  out.println("</head>");
  out.println("<body>");
  out.println('<div class="cpf">');

  // the layout switch (section 3.12.6): both options always present, the
  // chosen one starts checked; hidden visually but keyboard-reachable
  const tb = layout === "topbottom" ? " checked" : "";
  const sbs = layout === "sidebyside" ? " checked" : "";
  out.println(`<input type="radio" name="${prefix}layout" id="${prefix}lay-tb" class="cpf-radio"${tb}>`);
  out.println(`<input type="radio" name="${prefix}layout" id="${prefix}lay-sbs" class="cpf-radio"${sbs}>`);

  out.println('<header class="cpf-head">');
  out.println(`<h1>${escTitle}</h1>`);
  out.println(`<p>${model.participants.length} participants · ${model.events.length} events</p>`);
  out.println('<div class="cpf-switch" role="group" aria-label="Layout">');
  out.println(`<label for="${prefix}lay-tb">Top and bottom</label>`);
  out.println(`<label for="${prefix}lay-sbs">Side by side</label>`);
  out.println("</div>");
  out.println("</header>");

  out.println('<div class="cpf-main">');
  out.println('<section class="cpf-flow" aria-label="Diagram"><div class="cpf-scroll">');
  svgOn(model, out, prefix);
  out.println("</div></section>");
  out.println('<section class="cpf-detail" aria-label="Details"><div class="cpf-tscroll">');
  tableOn(model, out, prefix);
  out.println("</div></section>");
  out.println("</div>");

  out.println("</div>");
  out.println("</body>");
  out.println("</html>");
}

// the page for the API: same pageOn, string result
export function page(model, opts = {}) {
  const out = new Out();
  pageOn(model, out, opts);
  return out.toString();
}
