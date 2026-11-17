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

// Section 3.10: Mermaid sequenceDiagram from the IR. Every line except the
// front matter is indented by 4 spaces; the output ends with one \n. No
// Mermaid autonumber (it cannot number notes; section 3.10).

import { escMermaid } from "../escape.js";

// {text}: numbering prefix, then escaped caption lines joined with <br/>.
// An empty caption becomes #nbsp; (section 3.10).
function eventText(event) {
  const prefix = event.num === null ? "" : "(" + event.num + ") ";
  if (event.caption.length === 0) {
    return prefix + "#nbsp;";
  }
  const parts = [];
  for (const line of event.caption) {
    parts.push(escMermaid(line));
  }
  return prefix + parts.join("<br/>");
}

export function mermaidOn(model, out) {
  const lines = [];
  if (model.title !== undefined) {
    lines.push("---");
    lines.push("title: " + escMermaid(model.title));
    lines.push("---");
  }
  lines.push("sequenceDiagram");

  for (let i = 0; i < model.participants.length; i++) {
    const labels = [];
    for (const line of model.participants[i].label) {
      labels.push(escMermaid(line));
    }
    lines.push("    participant p" + (i + 1) + " as " + labels.join("<br/>"));
  }

  for (const e of model.events) {
    const a = "p" + (e.from + 1);
    const b = "p" + (e.to + 1);
    if (e.kind === "note") {
      lines.push("    Note right of " + a + ": " + eventText(e));
    } else {
      let arrow;
      if (e.kind === "reply") {
        arrow = "-->>"; // dashed with arrowhead (section 3.10)
      } else if (e.kind === "media" || e.kind === "mediaRepeat") {
        arrow = "-->"; // dotted, no arrowhead (section 3.10)
      } else {
        arrow = "->>"; // message and self (section 3.10)
      }
      lines.push("    " + a + arrow + b + ": " + eventText(e));
    }
    for (const note of e.notes) {
      lines.push("    %% " + e.id + " note: " + escMermaid(note));
    }
    for (const comment of e.comments) {
      lines.push("    %% " + e.id + " comment: " + escMermaid(comment));
    }
  }

  for (const l of lines) {
    out.println(l); // ends with one \n (section 3.10)
  }
}
