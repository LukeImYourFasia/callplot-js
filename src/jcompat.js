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

// Java-semantics helpers (section 3.5). Every renderer must format numbers
// through fmtI/fmtD and index buffers through CharBuf. No Node built-ins
// here: this file is part of the pure core (section 4.6, criterion 5).

// --- Error model: CallplotError + subclasses named after Java exceptions ---

export class CallplotError extends Error {
  constructor(message = "") {
    super(message);
  }
}
export class NumberFormatError extends CallplotError {}
export class IllegalArgumentError extends CallplotError {}
export class IndexError extends CallplotError {}
export class NullPointerError extends CallplotError {}
export class ArithmeticError extends CallplotError {}
export class NegativeArraySizeError extends CallplotError {}

// --- Number formatting ------------------------------------------------------

// "" + int (Java String concatenation of an int).
export function fmtI(n) {
  if (!Number.isInteger(n)) {
    throw new CallplotError("not a Java int: " + n);
  }
  return String(n);
}

// "" + double, i.e. Java Double.toString on OpenJDK 1.8.0_504.
// Confirmed table in section 3.5 (all rows ✅ on the reference JVM).
export function fmtD(x) {
  if (Number.isNaN(x)) return "NaN";
  if (x === Infinity) return "Infinity";
  if (x === -Infinity) return "-Infinity";
  if (x === 0) {
    // Java prints "0.0" and "-0.0"; JS prints "0" for both.
    return (1 / x === -Infinity) ? "-0.0" : "0.0";
  }
  const ax = x < 0 ? -x : x;
  if (ax >= 1e-3 && ax < 1e7) {
    let s = String(x); // in this range JS always prints plain decimal
    if (!s.includes(".")) s += ".0";
    return s;
  }
  // Scientific: Java uses <mantissa>E<exp>, mantissa always has a dot.
  const e = x.toExponential(); // e.g. "1.2345678e+7"
  const cut = e.indexOf("e");
  let m = e.slice(0, cut);
  let exp = e.slice(cut + 1);
  if (!m.includes(".")) m += ".0";
  if (exp.startsWith("+")) exp = exp.slice(1);
  return m + "E" + exp;
}

// --- Java int arithmetic ----------------------------------------------------

// Java int / int (truncating toward zero).
export function idiv(a, b) {
  if (b === 0) {
    throw new ArithmeticError("/ by zero");
  }
  return Math.trunc(a / b);
}

// Integer.parseInt (strict). Java 8 accepts a leading + or -.
// Throws NumberFormatError on anything else (" 5", "5 ", "" all throw).
export function parseJavaInt(s) {
  if (!/^[+-]?[0-9]+$/.test(s)) {
    throw new NumberFormatError('For input string: "' + s + '"');
  }
  const v = Number(s);
  if (v < -2147483648 || v > 2147483647) {
    throw new NumberFormatError('value out of int range: "' + s + '"');
  }
  return v;
}

// --- Java string utilities --------------------------------------------------

// Array/[] access in Java: out-of-bounds throws. Captions are stored as JS
// strings/arrays, but the model must throw like char[] indexing would.
export function arrAt(a, i) {
  if (i < 0 || i >= a.length) {
    throw new IndexError("Index out of range");
  }
  return a[i];
}

// String.trim: strips leading/trailing chars with code <= U+0020.
// NOT the same as JS trim(), which also strips Unicode spaces.
export function javaTrim(s) {
  let i = 0;
  let j = s.length;
  while (i < j && s.charCodeAt(i) <= 0x20) i++;
  while (j > i && s.charCodeAt(j - 1) <= 0x20) j--;
  return s.slice(i, j);
}

// String.split(regex) on Java:
//  - no match anywhere          -> [s]
//  - otherwise                  -> segments, with trailing empty strings dropped
//  - all segments empty         -> [] (confirmed on OpenJDK 1.8.0_504:
//                                  "//".split("/") has length 0)
export function javaSplit(s, re) {
  if (!re.test(s)) {
    return [s];
  }
  const segs = s.split(re);
  while (segs.length > 0 && segs[segs.length - 1] === "") {
    segs.pop();
  }
  return segs;
}

// java.util.StringTokenizer(s, delim): split on each delim char, drop empties.
export function tokenize(s, delim = "^") {
  const out = [];
  for (const t of s.split(delim)) {
    if (t.length > 0) out.push(t);
  }
  return out;
}

// --- char[] buffer ----------------------------------------------------------

// Java char[]: indexed by UTF-16 code unit. Every access outside [0, width)
// throws IndexError, like plain array access in Java.
export class CharBuf {
  constructor(width) {
    if (width < 0) {
      throw new NegativeArraySizeError(String(width));
    }
    this.a = new Array(width);
  }

  get(i) {
    if (i < 0 || i >= this.a.length) {
      throw new IndexError("Index out of range");
    }
    return this.a[i];
  }

  set(i, ch) {
    if (i < 0 || i >= this.a.length) {
      throw new IndexError("Index out of range");
    }
    this.a[i] = ch;
  }

  // System.arraycopy(src, 0, buf, at, n): bounds of the whole range are
  // checked before any write happens.
  copyIn(src, at, n) {
    if (n < 0 || at < 0 || at + n > this.a.length) {
      throw new IndexError("Index out of range");
    }
    for (let k = 0; k < n; k++) {
      this.a[at + k] = src[k];
    }
  }

  // new String(char[], offset, length): read n cells as a string.
  sliceString(at, n) {
    let s = "";
    for (let k = 0; k < n; k++) {
      s += this.get(at + k);
    }
    return s;
  }
}
