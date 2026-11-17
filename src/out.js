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

// In-memory stand-in for the Java PrintWriter (section 2.2, section 3.5).
// The core does no I/O; renderers write into an Out and the CLI prints it.

export class Out {
  constructor() {
    this.parts = [];
  }

  print(s) {
    this.parts.push(s);
  }

  println(s = "") {
    this.parts.push(s);
    this.parts.push("\n");
  }

  write(ch) {
    this.parts.push(ch);
  }

  toString() {
    return this.parts.join("");
  }
}

// java's System.err (section 3.7): process-wide, like the RunContext that
// carries it. Graffle's repeatLabel debug lines land here (section 3.8 #7).
export class Err {
  constructor() {
    this.parts = [];
  }

  print(s) {
    this.parts.push(s);
  }

  println(s = "") {
    this.parts.push(s);
    this.parts.push("\n");
  }

  toString() {
    return this.parts.join("");
  }
}
