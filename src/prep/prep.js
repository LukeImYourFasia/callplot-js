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

// Section 3.14: callplot-prep, a port of lib/prep.awk (mawk 1.3.4 oracle).
// The awk semantics are pinned (section 3.14.1): every rule is tested in
// order, `next` stops the rules for the line, changing $0 re-splits fields,
// print of numbers uses %.6g (awkNum), sub is first-match, gsub all.
// Section 3.14.4: awk appends debug lines to a file literally named "debug";
// the JS port only writes them where --debug-file pointed (logged Appendix B).

// awk prints numbers through OFMT %.6g: 6 significant digits, trailing
// zeros dropped. For this program's values (time-of-day diffs, at most
// ~86400) that is plain decimal; exponent cases (>= 1e6) do not occur here.
export function awkNum(x) {
  return String(parseFloat(x.toPrecision(6)));
}

// awk's toTime: replace every '/', ',', ' ', '.' with ':', split on ':',
// then arr[n]/1000 + arr[n-1] + 60*arr[n-2] + 3600*arr[n-3]. Empty or
// non-numeric parts convert like awk does: a leading-numeric prefix, or 0.
function toTime(ts) {
  const parts = ts.replace(/[/,. ]/g, ":").split(":");
  const n = parts.length;
  function at(i) {
    if (i < 1 || i > n) {
      return 0;
    }
    return awkNumPrefix(parts[i - 1]);
  }
  return at(n) / 1000 + at(n - 1) + 60 * at(n - 2) + 3600 * at(n - 3);
}

// awk string -> number: longest leading numeric prefix, 0 when none.
// A hand-rolled scan (no regex): time components here never carry
// exponents, and this avoids the security plugin's unsafe-regex warning.
function awkNumPrefix(s) {
  let i = 0;
  while (i < s.length && (s[i] === " " || s[i] === "\t")) {
    i++;
  }
  let j = i;
  if (j < s.length && (s[j] === "+" || s[j] === "-")) {
    j++;
  }
  const digitsStart = j;
  let seenDot = false;
  while (j < s.length) {
    const c = s[j];
    if (c >= "0" && c <= "9") {
      j++;
    } else if (c === "." && !seenDot) {
      seenDot = true;
      j++;
    } else {
      break;
    }
  }
  if (j === digitsStart) {
    return 0; // sign alone or no digits: awk gives 0
  }
  return parseFloat(s.slice(i, j));
}

// awk field semantics: FS " " splits on runs of blanks, ignoring leading
// and trailing blanks; missing fields are the empty string. $1/$2/$3...
function splitFields(line) {
  const trimmed = line.replace(/^[ \t]+/, "").replace(/[ \t]+$/, "");
  if (trimmed === "") {
    return ["", "", "", ""];
  }
  const f = trimmed.split(/[ \t]+/);
  while (f.length < 4) {
    f.push("");
  }
  return f;
}

export function prep(text, opts = {}) {
  const links = opts.links === true;
  const out = [];
  const debug = []; // awk ">> debug" lines; CLI sends them to --debug-file

  // BEGIN block
  out.push("opt/messageNumbering/on");
  out.push("opt/xml/on");
  out.push("opt/crunch/on");
  out.push(links ? "opt/links/on" : "opt/links/off");

  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let letidx = 0;
  const alias = {};
  const guys = {};
  let t0 = "";
  let t = "";
  let lt = "";
  let s = "";
  let d = "";
  let mDate = "";
  let mSrc = "";
  let mDest = "";

  // escape & < > of the CURRENT $0 (the awk gsub triple)
  function esc0(cur) {
    return cur.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // awk splits input lines on "\n"; a trailing newline adds no empty line
  const rawLines = text.split("\n");
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }

  for (let i = 0; i < rawLines.length; i++) {
    let cur = rawLines[i];
    // top rule block: sub("\r","",$0) -- first \r only, then re-split
    const cr = cur.indexOf("\r");
    if (cr >= 0) {
      cur = cur.slice(0, cr) + cur.slice(cr + 1);
    }
    let f = splitFields(cur);
    // rules 4/5 leading-date tests need $0 regex
    const date4 = /^Date [0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9]/;
    const date5 = /^[0-9][0-9]\/[0-9][0-9]\/[0-9][0-9][0-9][0-9]/;
    const method1 = /^(MESSAGE|INVITE|BYE|CANCEL|REGISTER|INFO|NOTIFY|SUBSCRIBE|PUBLISH)/;
    const verb1 = /^(GET|POST)/;
    const dash1 = /^-(MESSAGE|INVITE|BYE|CANCEL|REGISTER|INFO|NOTIFY|SUBSCRIBE|PUBLISH)/;
    const dashV = /^-(GET|POST)/;

    const setDate = () => {
      lt = t;
      t = cur;
      if (t0 === "") {
        t0 = t;
      }
      cur = esc0(cur);
      f = splitFields(cur);
      mDate = "!!" + cur;
    };

    // rule 1: $1 == "@" (first field exactly "@"; the awk sub("\r","",$3))
    if (f[0] === "@") {
      const a2 = f[1];
      const a3 = f[2].replace(/\r/, "");
      if (!(a3 in guys)) {
        out.push("guy/" + a3 + "/" + a3);
        guys[a3] = a3;
        debug.push("[" + a3 + "] going into guys");
      }
      alias[a2] = a3;
      continue;
    }

    // rule 2: starts with @
    if (cur.startsWith("@")) {
      out.push(cur.slice(1));
      continue;
    }
    // rule 3: starts with ----
    if (cur.startsWith("----")) {
      continue;
    }
    // rule 4
    if (date4.test(cur)) {
      setDate();
      continue;
    }
    // rule 5
    if (date5.test(cur)) {
      setDate();
      continue;
    }

    const setAddr = (isSrc) => {
      const raw = f[2].replace(/\r/, ""); // awk: sub("\r","",s) on the field
      let v = raw;
      if (isSrc) {
        if (v in alias) {
          v = alias[v];
        }
        if (!(v in guys)) {
          debug.push("[" + v + "] not in guys");
          const letr = letidx < letters.length ? letters[letidx] : "";
          letidx++;
          out.push("guy/" + letr + "/" + v);
          guys[v] = letr;
        }
        s = guys[v];
        cur = esc0(cur);
        f = splitFields(cur);
        mSrc = "!!" + cur;
      } else {
        if (v in alias) {
          v = alias[v];
        }
        if (!(v in guys)) {
          debug.push("[" + v + "] not in guys");
          const letr = letidx < letters.length ? letters[letidx] : "";
          letidx++;
          out.push("guy/" + letr + "/" + v);
          guys[v] = letr;
        }
        d = guys[v];
        cur = esc0(cur);
        f = splitFields(cur);
        mDest = "!!" + cur;
      }
    };

    if (cur.startsWith("Source Address")) {
      setAddr(true);
      continue;
    }
    if (cur.startsWith("Destination Address")) {
      setAddr(false);
      continue;
    }

    // rules 8-11 print, then fall through to rule 16
    const tdiffs = () => {
      const at = toTime(t);
      const bInit = toTime(t0);
      const bLast = toTime(lt);
      // awk's bt != "" guard: a number never string-equals "", so both
      // lines always print (section 3.14.1 quirk note)
      out.push("!!    " + awkNum(at - bInit) + " from initial");
      out.push("!!    " + awkNum(at - bLast) + " from last");
    };

    if (method1.test(f[0])) {
      out.push(s + "->" + d + "/" + f[0]);
      out.push(mDate);
      tdiffs();
      out.push(s.length > 1 ? mSrc + " (" + s + ")" : mSrc);
      out.push(mDest + " (" + d + ")");
    } else if (verb1.test(f[0])) {
      out.push(s + "->" + d + "/" + f[0]);
      out.push(mDate);
      tdiffs();
      out.push(s.length > 1 ? mSrc + " (" + s + ")" : mSrc);
      out.push(mDest + " (" + d + ")");
    } else if (cur.startsWith("SIP/2.0 ")) {
      const line = cur.replace(f[0] + " ", "");
      out.push(s + "->" + d + "/" + line);
      out.push(mDate);
      tdiffs();
      out.push(s.length > 1 ? mSrc + " (" + s + ")" : mSrc);
      out.push(mDest + " (" + d + ")");
    } else if (/^HTTP\/1.. /.test(cur)) {
      const line = cur.replace(f[0] + " ", "");
      out.push(s + "->" + d + "/" + line);
      out.push(mDate);
      tdiffs();
      out.push(s.length > 1 ? mSrc + " (" + s + ")" : mSrc);
      out.push(mDest + " (" + d + ")");
    }

    // rules 12-15: dash variants (also fall through)
    if (dash1.test(f[0])) {
      out.push("-" + s + "->" + d + "/" + f[0].slice(1));
    } else if (dashV.test(f[0])) {
      out.push("-" + s + "->" + d + "/" + f[0].slice(1));
    } else if (cur.startsWith("-SIP/2.0 ")) {
      const line = cur.replace(f[0] + " ", "");
      out.push("-" + s + "->" + d + "/" + line);
    } else if (/^-HTTP\/1.. /.test(cur)) {
      const line = cur.replace(f[0] + " ", "");
      out.push("-" + s + "->" + d + "/" + line);
    }

    // rule 16: every line that reaches here (and 8-15 fall-throughs)
    cur = esc0(cur);
    f = splitFields(cur);
    out.push("!" + cur);
  }

  return { out: out.join("\n") + (out.length > 0 ? "\n" : ""), debug };
}
