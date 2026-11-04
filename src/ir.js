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

// Section 3.9: the IR model for the new outputs (Mermaid, PlantUML, HTML).
// buildModel(flow) runs after flow.layout() and never changes Flow.

import { IllegalArgumentError } from "./jcompat.js";
import { isNote, isSelf, isUndirected } from "./model.js";

/** @typedef {{ alias: string, label: string[], index: number }} Participant */
/** @typedef {{
 *   id: string,              // 'e1', 'e2', … in event order
 *   kind: 'message'|'reply'|'media'|'mediaRepeat'|'self'|'note',
 *   from: number, to: number, // participant indexes
 *   caption: string[],        // caption lines
 *   num: number|null,         // display number, or null
 *   notes: string[],          // !! lines
 *   comments: string[],       // ! lines
 *   srcLine: number           // 1-based input line
 * }} Event */
/** @typedef {{ title: string|undefined, participants: Participant[], events: Event[],
 *   options: { messageNumbering: boolean, noteNumbering: boolean, htmlLayout: string|undefined } }} Model */

export function buildModel(flow) {
  // Step 1: participants, one per player, in order (labels copied).
  const participants = [];
  const aliasIndex = new Map(); // alias -> index of the FIRST player (step 3)
  for (let i = 0; i < flow.players.length; i++) {
    const p = flow.players[i];
    participants.push({ alias: p.name, label: p.caption.slice(), index: i });
    if (!aliasIndex.has(p.name)) {
      aliasIndex.set(p.name, i);
    }
  }

  // Step 3: same first-match rule and same error as Flow.columnOf.
  function indexOf(alias) {
    const idx = aliasIndex.get(alias);
    if (idx === undefined) {
      throw new IllegalArgumentError("no player named " + alias);
    }
    return idx;
  }

  const messageNumbering = flow.getDoNumbering();
  const noteNumbering = flow.getDoNoteNumbering();

  const events = [];
  let n = 1; // step 5 counter
  for (let i = 0; i < flow.messages.length; i++) {
    const m = flow.messages[i];
    const from = indexOf(m.from);
    const to = indexOf(m.to);

    // Step 4: kind, first matching rule wins.
    let kind;
    if (isNote(m)) {
      kind = "note";
    } else if (isSelf(m)) {
      kind = "self";
    } else if (isUndirected(m) && m.repeatLabel) {
      kind = "mediaRepeat";
    } else if (isUndirected(m)) {
      kind = "media";
    } else if (m.isReply) {
      kind = "reply";
    } else {
      kind = "message";
    }

    // Step 5: num; step 6: id depends only on event order, never options.
    /** @type {number|null} */
    let num = null;
    if (messageNumbering && (from !== to || noteNumbering)) {
      num = n;
      n += 1;
    }

    events.push({
      id: "e" + (i + 1),
      kind,
      from,
      to,
      caption: m.caption.slice(),
      num,
      notes: m.notes.slice(),
      comments: m.comments.slice(),
      srcLine: m.srcLine
    });
  }

  // Step 7: title and htmlLayout come from the input options (section 3.3).
  return {
    title: flow.opts.get("title"),
    participants,
    events,
    options: {
      messageNumbering,
      noteNumbering,
      htmlLayout: flow.opts.get("htmlLayout")
    }
  };
}
