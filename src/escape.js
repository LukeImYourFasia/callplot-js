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

// Escapes for the new outputs (file map). Each escape runs in ONE pass over
// the text so escapes it emits are never re-escaped (section 3.10, 3.11).

// PlantUML escapes (section 3.11): ~ in front of each markup character.
// Deviation logged at W13: the pinned plantuml.jar rejects ~" inside a
// quoted participant string, so " becomes &#34; instead of ~". The jar
// parses &#34; everywhere and renders it as a literal " in titles,
// participant labels, messages and notes (&quot; also parses but renders
// literally, so the numeric form is the right one).
export function escPlantuml(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\"") {
      out += "&#34;";
    } else if (c === "~" || c === "*" || c === "_" || c === "-" ||
      c === "/" || c === "<" || c === "[" || c === "\\") {
      out += "~" + c;
    } else {
      out += c;
    }
  }
  return out;
}

// Mermaid entity-ish escapes: # ; < > " (section 3.10).
export function escMermaid(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "#") {
      out += "#35;";
    } else if (c === ";") {
      out += "#59;";
    } else if (c === "<") {
      out += "#lt;";
    } else if (c === ">") {
      out += "#gt;";
    } else if (c === "\"") {
      out += "#quot;";
    } else {
      out += c;
    }
  }
  return out;
}

// HTML escapes for the -html page (§3.12.1 + §3.12.3): every user string
// passes through escHtml in text, attributes and link text. Single pass.
// Landed with W14 (svg.js needs it), though the W-plan names it under W15.
export function escHtml(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "&") {
      out += "&amp;";
    } else if (c === "<") {
      out += "&lt;";
    } else if (c === ">") {
      out += "&gt;";
    } else if (c === "\"") {
      out += "&quot;";
    } else if (c === "'") {
      out += "&#39;";
    } else {
      out += c;
    }
  }
  return out;
}
