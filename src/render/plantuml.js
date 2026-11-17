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

// Section 3.11: PlantUML from the IR. Lines carry no indent; caption lines
// are joined with a literal \n (backslash + n) which PlantUML draws as a
// line break; media arrows are teal with two heads (§3.11 table).

import { escPlantuml } from "../escape.js";

// {text}: numbering prefix + escaped caption lines joined with \n.
function eventText(event) {
  const prefix = event.num === null ? "" : "(" + event.num + ") ";
  const parts = [];
  for (const line of event.caption) {
    parts.push(escPlantuml(line));
  }
  return prefix + parts.join("\\n");
}

export function plantumlOn(model, out) {
  out.println("@startuml");
  if (model.title !== undefined) {
    out.println("title " + escPlantuml(model.title));
  }
  out.println("hide footbox");

  for (let i = 0; i < model.participants.length; i++) {
    const labels = [];
    for (const line of model.participants[i].label) {
      labels.push(escPlantuml(line));
    }
    const joined = labels.join("\\n");
    if (joined === "") {
      // the pinned jar rejects participant "" as pN; declare it bare
      out.println("participant p" + (i + 1));
    } else {
      out.println("participant \"" + joined + "\" as p" + (i + 1));
    }
  }

  for (const e of model.events) {
    const a = "p" + (e.from + 1);
    const b = "p" + (e.to + 1);
    if (e.kind === "note") {
      out.println("note right of " + a + " : " + eventText(e));
    } else {
      let arrow;
      if (e.kind === "reply") {
        arrow = "-->"; // dashed (section 3.11)
      } else if (e.kind === "media" || e.kind === "mediaRepeat") {
        arrow = "<-[#008080]->"; // teal, 2 heads (section 3.11)
      } else {
        arrow = "->"; // message and self (section 3.11)
      }
      out.println(a + " " + arrow + " " + b + " : " + eventText(e));
    }
    for (const note of e.notes) {
      out.println("' " + e.id + " note: " + escPlantuml(note));
    }
    for (const comment of e.comments) {
      out.println("' " + e.id + " comment: " + escPlantuml(comment));
    }
  }

  out.println("@enduml");
}
