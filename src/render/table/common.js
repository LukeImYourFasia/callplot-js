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

// Shared pieces for the six legacy table styles (section 3.13). Xalan's XML
// output method closes an element with no content as <foo/> (section 3.13.3
// rule 5), so a cell with no content is <td/>.

// XML declaration line (section 3.13.3 rule 1); the document has no
// trailing line end (rule 2).
export const XMLDECL = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";

// Col 1 cell with the diagram link (all styles except nolinks).
export function linkCell(num) {
  return (
    "<td><message><a name=\"t" +
    num +
    "\"/><a href=\"#m" +
    num +
    "\">" +
    num +
    "</a></message></td>"
  );
}

// Col 1 cell without links (nolinks).
export function plainCell(num) {
  return "<td><message>" + num + "</message></td>";
}

// A <td> holding html, or <td/> when html is empty (rule 5).
export function tdCell(html) {
  return html === "" ? "<td/>" : "<td>" + html + "</td>";
}

// Note/comment text nodes are printed on their own line by printComment
// (section 3.4.1), so Xalan's value-of writes them with the newlines:
// "\ntext\n" then the <br/>.
export function noteBody(notes) {
  let s = "";
  for (const n of notes) {
    s += "\n" + n + "\n" + "<br/>";
  }
  return s;
}

export function commentBody(comments) {
  let s = "";
  for (const c of comments) {
    s += "\n" + c + "\n" + "<br/>";
  }
  return s;
}

export function captionBody(captions) {
  let s = "";
  for (const c of captions) {
    s += c + "<br/>";
  }
  return s;
}

// Col 3 of archtable/htmltable/nolinks: the <tt> stays even when empty, so
// an empty comments list serializes as <td><tt/></td> (rule 6).
export function ttCell(comments) {
  const body = commentBody(comments);
  return "<td>" + (body === "" ? "<tt/>" : "<tt>" + body + "</tt>") + "</td>";
}

export function strongCell(captions) {
  let s = "";
  for (const c of captions) {
    s += "<strong>" + c + "</strong><br/>";
  }
  return s;
}

export function codeCell(notes) {
  let s = "";
  for (const n of notes) {
    s += "<code>\n" + n + "\n</code><br/>";
  }
  return s;
}
