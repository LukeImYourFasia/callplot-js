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

import {
  XMLDECL,
  captionBody,
  noteBody,
  commentBody
} from "./common.js";

// wordtable style: lib/wordtable.xsl, a Word 9 export document. All fixed
// text is copied from the goldens byte for byte (attribute order included).
const HEAD =
  XMLDECL +
  "<html xmlns=\"http://www.w3.org/TR/REC-html40\" " +
  "xmlns:w=\"urn:schemas-microsoft-com:office:word\" " +
  "xmlns:o=\"urn:schemas-microsoft-com:office:office\">" +
  "<head>" +
  "<meta content=\"text/html; charset=windows-1252\" http-equiv=\"Content-Type\"/>" +
  "<meta content=\"Word.Document\" name=\"ProgId\"/>" +
  "<meta content=\"Microsoft Word 9\" name=\"Generator\"/>" +
  "<meta content=\"Microsoft Word 9\" name=\"Originator\"/>" +
  "<style/></head>" +
  "<body style=\"tab-interval:.5in\" lang=\"EN-US\">" +
  "<div class=\"Section1\"><pre>";

const TABLE_OPEN =
  "<table style=\"border-collapse:collapse;border:none;" +
  "mso-border-alt:solid windowtext .5pt;mso-padding-alt:0in 5.4pt 0in 5.4pt\" " +
  "cellpadding=\"0\" cellspacing=\"0\" border=\"1\">";

// Header row: the three fixed <td>s (double space after .5pt; in col 1 is
// in the golden).
const HEADER_ROW =
  "<tr>" +
  "<td style=\"width:48.3pt;border:solid windowtext .5pt;  " +
  "padding:0in 5.4pt 0in 5.4pt\" valign=\"top\" width=\"64\">" +
  "<p class=\"MsoNormal\"><b>Number<o:p/></b></p></td>" +
  "<td style=\"width:171.0pt;border:solid windowtext .5pt;border-left:none;" +
  "mso-border-left-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt\" " +
  "valign=\"top\" width=\"228\">" +
  "<p class=\"MsoNormal\"><b>Annotation<o:p/></b></p></td>" +
  "<td style=\"width:3.2in;border:solid windowtext .5pt;border-left:none;" +
  "mso-border-left-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt\" " +
  "valign=\"top\" width=\"307\">" +
  "<p class=\"MsoNormal\"><b>Packet<o:p/></b></p></td>" +
  "</tr>";

const BODY_TD1_OPEN =
  "<td style=\"width:48.3pt;border:solid windowtext .5pt;border-top:none;" +
  "mso-border-top-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt\" " +
  "valign=\"top\" width=\"64\">";

const BODY_TD2_OPEN =
  "<td style=\"width:171.0pt;border-top:none;border-left:none;border-bottom:" +
  "solid windowtext .5pt;border-right:solid windowtext .5pt;" +
  "mso-border-top-alt:solid windowtext .5pt;mso-border-left-alt:" +
  "solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt\" " +
  "valign=\"top\" width=\"228\">";

const BODY_TD3_OPEN =
  "<td style=\"width:3.2in;border-top:none;border-left:none;border-bottom:" +
  "solid windowtext .5pt;border-right:solid windowtext .5pt;" +
  "mso-border-top-alt:solid windowtext .5pt;mso-border-left-alt:" +
  "solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt\" " +
  "valign=\"top\" width=\"307\">";

// wordtable style: the Word export document. The table is never empty (it
// always carries the header row), and every cell holds a <p class="MsoNormal">.
export function wordtable(picture, rows) {
  let out = HEAD + picture + "</pre>" + TABLE_OPEN + HEADER_ROW;
  for (const r of rows) {
    out += "<tr>";
    out +=
      BODY_TD1_OPEN +
      "<p class=\"MsoNormal\"><message><a name=\"t" +
      r.num +
      "\"/><a href=\"#m" +
      r.num +
      "\">" +
      r.num +
      "</a></message></p></td>";
    out +=
      BODY_TD2_OPEN +
      "<p class=\"MsoNormal\">" +
      captionBody(r.captions) +
      noteBody(r.notes) +
      "</p></td>";
    out +=
      BODY_TD3_OPEN +
      "<p class=\"MsoNormal\"><span style=\"font-family:&quot;Courier New&quot;\">" +
      commentBody(r.comments) +
      "<o:p/></span></p></td>";
    out += "</tr>";
  }
  return out + "</table></div></body></html>";
}
