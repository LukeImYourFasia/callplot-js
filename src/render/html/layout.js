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

// Section 3.12.4: diagram geometry for the -html SVG, in CSS pixels. Text
// width is estimated (never measured) so the output is machine-independent.

export const CW = 7.5; // one caption character (12.5px mono font)
export const LABW = 7.6; // one label character (13px UI font)
export const LH = 16; // one text line
export const M = 28; // left and right margin
export const TOP = 16; // space above the participant boxes
export const PITCH_MIN = 150;
export const PITCH_MAX = 300;

// Geometry the svg.js draws and layout.js widths must agree on (my
// decisions where section 3.12.4 leaves the drawing open):
export const NOTE_DX = 12; // note box left edge, right of the lifeline
export const NOTE_PAD = 16; // note box width = caption width + padding
export const NOTE_DY = 18; // note box top inside its event band
export const SELF_W = 34; // self loop width
export const SELF_H = 18; // self loop height
export const SELF_DX = 40; // self caption left edge, right of the loop
export const HL_DY = 8; // .hl rect starts 8px above the band top
export const HL_BOT = 12; // SVG height = last event bottom + 12

/** @typedef {{
 *   pitch: number, boxH: number, top0: number, x: number[], n: number,
 *   W: number, H: number, CW: number, LABW: number, LH: number, M: number,
 *   TOP: number, PITCH_MIN: number, PITCH_MAX: number,
 *   events: Array<{ top: number, h: number }>, capLens: number[]
 * }} HtmlLayout */

// Estimated caption width of an event (step 1): longest caption line
// times CW, plus room for the badge (numbered events get the wider room).
function capW(event) {
  let len = 0;
  for (const line of event.caption) {
    if (line.length > len) {
      len = line.length;
    }
  }
  return len * CW + (event.num ? 28 : 6);
}

export function computeLayout(model) {
  // Steps 2-3: pitch starts at 150, raised by the widest label and by
  // every event that spans 2 or more lifelines.
  let pitch = PITCH_MIN;
  let labelLines = 1;
  for (const p of model.participants) {
    let len = 0;
    for (const line of p.label) {
      if (line.length > len) {
        len = line.length;
      }
    }
    if (p.label.length > labelLines) {
      labelLines = p.label.length;
    }
    pitch = Math.max(pitch, len * LABW + 36);
  }
  for (const e of model.events) {
    const span = Math.abs(e.from - e.to);
    if (span >= 2) {
      pitch = Math.max(pitch, capW(e) / span + 24);
    }
  }

  // Step 4: round, then cap at 300.
  pitch = Math.min(Math.round(pitch), PITCH_MAX);

  // Step 5: lifelines are centered in their pitch slots.
  const n = model.participants.length;
  const x = [];
  for (let i = 0; i < n; i++) {
    x.push(M + pitch / 2 + i * pitch);
  }

  // Steps 6-8: band stacking. First event starts below the boxes.
  const boxH = 14 + labelLines * LH;
  const top0 = TOP + boxH + 30;
  const bands = [];
  const capLens = [];
  let top = top0;
  let rightEdge = 2 * M + n * pitch;
  for (let i = 0; i < model.events.length; i++) {
    const e = model.events[i];
    let len = 0;
    for (const line of e.caption) {
      if (line.length > len) {
        len = line.length;
      }
    }
    capLens.push(len);
    const lines = e.caption.length;
    const h = lines * LH + (e.kind === "self" ? 38 : 30);
    bands.push({ top, h });
    top += h;
    if (e.kind === "note" || e.kind === "self") {
      const edge = e.kind === "note" ? x[e.from] + NOTE_DX + len * CW + NOTE_PAD : x[e.from] + SELF_DX + len * CW;
      if (edge + M > rightEdge) {
        rightEdge = edge + M;
      }
    }
  }
  const H = (bands.length === 0 ? top0 : bands[bands.length - 1].top + bands[bands.length - 1].h) + HL_BOT;

  return {
    pitch,
    boxH,
    top0,
    x,
    n,
    W: rightEdge,
    H,
    CW,
    LABW,
    LH,
    M,
    TOP,
    PITCH_MIN,
    PITCH_MAX,
    NOTE_DX,
    NOTE_PAD,
    NOTE_DY,
    SELF_W,
    SELF_H,
    SELF_DX,
    HL_DY,
    HL_BOT,
    events: bands,
    capLens
  };
}
