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

// Section 3.12.3 + 3.12.4: the inline SVG of the -html page, written into
// the Out line by line. Colors come from the --cpf-* tokens with fallbacks
// so the SVG also paints on its own (visual checks). Reply lines are
// dashed, media lines are teal without arrowheads (§3.12.4 table).

import { escHtml } from "../../escape.js";
import { computeLayout } from "../html/layout.js";

// §3.12.3: kind classes are ev-{kind}; mediaRepeat prints as ev-media.
function kindClass(kind) {
  if (kind === "mediaRepeat") {
    return "media";
  }
  return kind;
}

export function svgOn(model, out, prefix = "") {
  const L = computeLayout(model);
  const bottom = L.H - L.HL_BOT;
  out.println(`<svg class="cpf-svg" xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}" role="img" aria-label="Call flow diagram">`);

  // lifelines: from just under the boxes down to the last band's bottom
  for (const xi of L.x) {
    out.println(`<line class="lf" x1="${xi}" x2="${xi}" y1="${L.TOP + L.boxH}" y2="${bottom}" stroke="var(--cpf-line, #b7c2cc)" stroke-dasharray="1 3"/>`);
  }

  // participant boxes with their labels
  for (let i = 0; i < model.participants.length; i++) {
    const p = model.participants[i];
    const xi = L.x[i];
    let maxLen = 0;
    for (const line of p.label) {
      if (line.length > maxLen) {
        maxLen = line.length;
      }
    }
    const bw = maxLen * L.LABW + 16;
    const bh = p.label.length * L.LH + 14;
    out.println(`<g class="pf">`);
    out.println(`<rect class="pf-box" x="${xi - bw / 2}" y="${L.TOP}" width="${bw}" height="${bh}" rx="4" fill="var(--cpf-head, #e8eef4)" stroke="var(--cpf-line, #b7c2cc)"/>`);
    for (let j = 0; j < p.label.length; j++) {
      out.println(`<text class="lb" x="${xi}" y="${L.TOP + 11 + j * L.LH}" fill="var(--cpf-ink, #17232e)" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" text-anchor="middle">${escHtml(p.label[j])}</text>`);
    }
    out.println("</g>");
  }

  // events, one group each (§3.12.3 link contract + §3.12.4 hl rect)
  for (let i = 0; i < model.events.length; i++) {
    const e = model.events[i];
    const band = L.events[i];
    const y = band.top;
    const h = band.h;
    out.println(`<g class="ev ev-${kindClass(e.kind)}" id="${prefix}flow-${e.id}">`);
    out.println(`<rect class="hl" x="0" y="${y - L.HL_DY}" width="100%" height="${h}" fill="none"/>`);

    const lines = e.caption.length;
    const ay = y + lines * L.LH + 15; // the line sits inside the bottom 30px
    if (e.kind !== "note" && e.kind !== "self") {
      const x1 = L.x[e.from];
      const x2 = L.x[e.to];
      const dir = x2 >= x1 ? 1 : -1;
      let dash = "";
      let color = "var(--cpf-ink, #17232e)";
      if (e.kind === "reply") {
        dash = ' stroke-dasharray="6 4"';
      } else if (e.kind === "media") {
        color = "#008080";
        dash = ' stroke-dasharray="5 4"';
      } else if (e.kind === "mediaRepeat") {
        color = "#008080";
        dash = ' stroke-dasharray="2 3"';
      }
      out.println(`<line class="ln" x1="${x1}" y1="${ay}" x2="${x2 - dir * 9}" y2="${ay}" stroke="${color}"${dash}/>`);
      if (e.kind === "message" || e.kind === "reply") {
        out.println(`<polygon class="ah" points="${x2},${ay} ${x2 - dir * 9},${ay - 4} ${x2 - dir * 9},${ay + 4}" fill="${color}"/>`);
      }
    } else if (e.kind === "self") {
      const x1 = L.x[e.from];
      out.println(`<polyline class="ln" points="${x1},${ay - L.SELF_H / 2} ${x1 + L.SELF_W},${ay - L.SELF_H / 2} ${x1 + L.SELF_W},${ay + L.SELF_H / 2} ${x1},${ay + L.SELF_H / 2}" stroke="var(--cpf-ink, #17232e)" fill="none"/>`);
      out.println(`<polygon class="ah" points="${x1},${ay + L.SELF_H / 2} ${x1 + 9},${ay + L.SELF_H / 2 - 4} ${x1 + 9},${ay + L.SELF_H / 2 + 4}" fill="var(--cpf-ink, #17232e)"/>`);
    } else {
      const x1 = L.x[e.from];
      const boxW = L.capLens[i] * L.CW + L.NOTE_PAD;
      out.println(`<rect class="nt" x="${x1 + L.NOTE_DX}" y="${y + L.NOTE_DY}" width="${boxW}" height="${lines * L.LH + 12}" rx="4" fill="var(--cpf-note-fill, #fff8dd)" stroke="var(--cpf-note-line, #c8b45f)"/>`);
    }

    // caption lines
    let tx;
    let anchor;
    let mono;
    if (e.kind === "self") {
      tx = L.x[e.from] + L.SELF_DX;
      anchor = "start";
      mono = "";
    } else if (e.kind === "note") {
      tx = L.x[e.from] + L.NOTE_DX + (L.capLens[i] * L.CW + L.NOTE_PAD) / 2;
      anchor = "middle";
      mono = ' font-family="ui-monospace, Menlo, Consolas, monospace"';
    } else {
      tx = (L.x[e.from] + L.x[e.to]) / 2;
      anchor = "middle";
      mono = ' font-family="ui-monospace, Menlo, Consolas, monospace"';
    }
    for (let j = 0; j < lines; j++) {
      out.println(`<text class="cap" x="${tx}" y="${y + 12 + j * L.LH}" text-anchor="${anchor}" fill="var(--cpf-ink, #17232e)"${mono} font-size="12.5">${escHtml(e.caption[j])}</text>`);
    }

    // badge: numbered events show (N) text over a circle r=10, others a
    // dot r=5; it links to the row (§3.12.3)
    let bx;
    let by;
    if (e.kind === "note" || e.kind === "self") {
      bx = L.x[e.from];
      by = y + h / 2;
    } else {
      bx = (L.x[e.from] + L.x[e.to]) / 2;
      by = ay;
    }
    out.println(`<a class="badge" href="#${prefix}detail-${e.id}">`);
    if (e.num) {
      out.println(`<circle class="bdg" cx="${bx}" cy="${by}" r="10" fill="var(--cpf-accent, #2f6b8f)"/>`);
      out.println(`<text class="bn" x="${bx}" y="${by + 4}" font-size="12" text-anchor="middle" fill="var(--cpf-page, #ffffff)">${e.num}</text>`);
    } else {
      out.println(`<circle class="bdg" cx="${bx}" cy="${by}" r="5" fill="var(--cpf-accent, #2f6b8f)"/>`);
    }
    out.println("</a>");
    out.println("</g>");
  }

  out.println("</svg>");
}
