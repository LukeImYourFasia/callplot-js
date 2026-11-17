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

import { XMLDECL, plainCell, tdCell, captionBody, noteBody, ttCell } from "./common.js";

// nolinks style: lib/nolinks.xsl. Like archtable but col 1 carries just
// the number (no <a> links); the picture keeps its links (they are copied
// verbatim; section 3.13.2).
export function nolinks(picture, rows) {
  let out = XMLDECL + "<html><body><pre>" + picture + "</pre>";
  if (rows.length === 0) {
    out += "<table border=\"true\"/>";
  } else {
    out += "<table border=\"true\">";
    for (const r of rows) {
      out +=
        "<tr>" +
        plainCell(r.num) +
        tdCell(captionBody(r.captions) + noteBody(r.notes)) +
        ttCell(r.comments) +
        "</tr>";
    }
    out += "</table>";
  }
  return out + "</body></html>";
}
