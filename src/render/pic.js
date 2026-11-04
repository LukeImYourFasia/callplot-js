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

// PIC (XPICTURE) renderer (section 3.4.2, chunk C6).
// Flow.java:449-461 and 575-576 (prologue/epilogue of drawPictureOn),
// Player.java:124-126 (drawPictureOn PIC branch),
// Message.java:233-252 (drawPictureOn PIC branch).
// PIC never calls columnOf (section 3.8 #8), so unknown aliases are fine.

import { MODES } from "../constants.js";
import { fmtD } from "../jcompat.js";
import { isSelf, isUndirected } from "../model.js";

// Flow.java:449-461 + 562-576 for the PIC bit: the shared drawPictureOn
// skeleton with only the PIC branches filled in.
export function picOn(f, out, mode) {
  f.startMessageNumbers();

  if ((mode & MODES.XML) !== 0) {
    out.println("<plot>"); // Flow.java:454-456
    out.println("<picture>");
  }

  // prologue, Flow.java:460-461
  out.print(".PS " + f.picXSize + " " + f.picYSize + "\n");

  // PIC never sets vml_x_size/vml_y_size and never reads them (Java leaves
  // them 0 here); nothing to do.

  for (const p of f.players) {
    drawPlayerPic(f, p, out); // Flow.java:563-566
  }
  for (const m of f.messages) {
    drawMessagePic(f, m, out); // Flow.java:568-571
  }

  // epilogue, Flow.java:575-576: println(".PE\n") prints .PE plus a blank line
  out.println(".PE\n");
}

// Player.java:124-126
function drawPlayerPic(f, p, out) {
  out.print(
    "P" + p.name + ": { box \"" + p.captionString +
      "\"; down; L" + p.name + ": line " +
      fmtD(f.getTotalHeight() / 6.0 + 0.25) +
      "i from last box.s }; right; move 2i\n"
  );
}

// Message.java:235-252
function drawMessagePic(f, m, out) {
  const off = fmtD((-1.0 * m.line) / 6.0); // Java: -1.0D * line / 6.0D
  if (isSelf(m)) {
    out.print(
      "{ line invis \"" + m.captionString + "\" \"\" from L" + m.from +
        ".start + (0," + off + ") to L" + m.to + ".start + (0.1," + off +
        ");  }\n"
    );
  } else if (isUndirected(m)) {
    out.print(
      "{ line dotted \"" + m.captionString + "\" \"\" from L" + m.from +
        ".start + (0," + off + ") to L" + m.to + ".start + (0," + off +
        ");  }\n"
    );
  } else {
    out.print(
      "{ arrow \"" + m.captionString + "\" \"\" from L" + m.from +
        ".start + (0," + off + ") to L" + m.to + ".start + (0," + off +
        ");  }\n"
    );
  }
}
