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

import { XMLDECL, linkCell, tdCell, strongCell, codeCell, commentBody } from "./common.js";

const HEADER =
  "<tr><th>Seq</th><th>Message and Details</th><th>Notes</th></tr>";

// htmltable2 style: lib/htmltable2.xsl. The picture sits inside <small>;
// the table has a header row, captions are <strong>, notes are <code>,
// comments sit bare in col 3 (the <tt> is gone, so empty col 3 is <td/>).
export function htmltable2(picture, rows) {
  let out =
    XMLDECL +
    "<html><body><small><pre>" +
    picture +
    "</pre></small><table border=\"1\">" +
    HEADER;
  for (const r of rows) {
    out +=
      "<tr>" +
      linkCell(r.num) +
      tdCell(strongCell(r.captions) + codeCell(r.notes)) +
      tdCell(commentBody(r.comments)) +
      "</tr>";
  }
  return out + "</table></body></html>";
}
