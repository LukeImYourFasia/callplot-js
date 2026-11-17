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

// Port of CallplotConstants.java:30-49 (JS by Edgar Villanueva).
// VML_X_SIZE and VML_BOX_PERCENT are unused by the program (see Flow.java).

// New bits follow section 2.2 exactly (TABLE was implemented early at W11
// with a placeholder bit; realigned with W15 so HTML takes the section's
// 0x100. Bit values are internal: no golden or CLI output depends on them.)
export const MODES = {
  TEXT: 0x01,
  PIC: 0x02,
  XML: 0x04,
  VML: 0x08,
  SVG: 0x10,
  GRAFFLE: 0x20,
  MERMAID: 0x40,
  PLANTUML: 0x80,
  HTML: 0x100,
  TABLE: 0x200
};

export const GRAFFLE_MULT = 14;
export const GRAFFLE_TOP_MARG = 15;
export const GRAFFLE_LINE_TXT_OFST = -7;

export const VML_TEXT_XOFF = 1;
export const VML_TEXT_YOFF = 2;
