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

import { XMLDECL, linkCell, tdCell, captionBody, noteBody, ttCell } from "./common.js";

// htmltable style: lib/htmltable.xsl. Col 2 shows captions THEN notes.
// lib/tmltable.xsl is a byte copy of this file (section 1.3), so tmltable
// aliases here.
export function htmltable(picture, rows) {
  let out = XMLDECL + "<html><body><pre>" + picture + "</pre>";
  if (rows.length === 0) {
    out += "<table border=\"1\"/>";
  } else {
    out += "<table border=\"1\">";
    for (const r of rows) {
      out +=
        "<tr>" +
        linkCell(r.num) +
        tdCell(captionBody(r.captions) + noteBody(r.notes)) +
        ttCell(r.comments) +
        "</tr>";
    }
    out += "</table>";
  }
  return out + "</body></html>";
}
