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

// Section 3.12.5: the detail table of the -html page. One row per event,
// including events without a number (the legacy tables only had numbered
// ones). Column 1 holds the back link and stays pinned (sticky per section
// 3.12.3); the header row is sticky; kinds print as pills; col2 keeps the
// htmltable3 meaning (caption lines + !! notes), col3 its ! comments.

import { escHtml } from "../../escape.js";

/** @typedef {{ alias: string, label: string[], index: number }} Participant */

// label lines joined with a space (section 3.12.5, column 3)
function labelOne(p) {
  return escHtml(p.label.join(" "));
}

// kind word for the pill: mediaRepeat prints as "repeat"
function kindWord(kind) {
  return kind === "mediaRepeat" ? "repeat" : kind;
}

// the back link text + aria-label (section 3.12.3)
function backLink(event, prefix) {
  const text = event.num ? "↑ " + event.num : "↑ ·";
  const aria = event.num
    ? "Back to message " + event.num + " in the diagram"
    : "Back to this event in the diagram";
  return `<a class="back" href="#${prefix}flow-${event.id}" aria-label="${escHtml(aria)}">${escHtml(text)}</a>`;
}

export function tableOn(model, out, prefix) {
  out.println(`<table class="cpf-table">`);
  out.println("<thead><tr><th>#</th><th>Kind</th><th>From → To</th>" +
    "<th>Message and details</th><th>Notes</th><th>Line</th></tr></thead>");
  out.println("<tbody>");
  for (const e of model.events) {
    out.println(`<tr id="${prefix}detail-${e.id}">`);

    // column 1: the back link, a row-header cell pinned at the left edge
    out.println(`<th class="k" scope="row">${backLink(e, prefix)}</th>`);

    // column 2: kind pill
    out.println(`<td><span class="pill">${kindWord(e.kind)}</span></td>`);

    // column 3: From → To; media uses ⋯, a note shows "note on A"
    const a = labelOne(model.participants[e.from]);
    const b = labelOne(model.participants[e.to]);
    let who;
    if (e.kind === "note") {
      who = "note on " + a;
    } else if (e.kind === "media" || e.kind === "mediaRepeat") {
      who = a + " ⋯ " + b;
    } else {
      who = a + " → " + b;
    }
    out.println(`<td>${who}</td>`);

    // column 4: caption lines bold, then !! notes in mono, one per line
    const parts = [];
    for (const line of e.caption) {
      parts.push("<strong>" + escHtml(line) + "</strong>");
    }
    for (const note of e.notes) {
      parts.push("<code>" + escHtml(note) + "</code>");
    }
    out.println("<td>" + parts.join("<br>") + "</td>");

    // column 5: ! comments as a list, an em-dash when there are none
    if (e.comments.length === 0) {
      out.println("<td>—</td>");
    } else {
      const items = [];
      for (const c of e.comments) {
        items.push("<li>" + escHtml(c) + "</li>");
      }
      out.println("<td><ul>" + items.join("") + "</ul></td>");
    }

    // column 6: source line, right-aligned by CSS with tabular digits
    out.println(`<td>${e.srcLine}</td>`);
    out.println("</tr>");
  }
  out.println("</tbody>");
  out.println("</table>");
}
