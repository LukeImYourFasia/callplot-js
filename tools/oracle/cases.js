// Fuzz case generator (DESIGN.md section 4.5, rules 1-3).
// Seeded random (mulberry32): the same seed and count always give the same
// cases in the same order, so re-runs reproduce the same diffs.
// @ts-check

/** @param {number} seed @returns {(() => number)} a [0,1) generator. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = (t ^ (t >>> 15)) * (t | 1);
    t ^= t + t * 7;
    return ((t ^ (t >>> 4)) >>> 0) / 4294967296;
  };
}

/** Option names from section 3.3, split by value type. */
const INT_OPTIONS = ["startLine", "startColumn", "linePitch", "columnPitch", "vmlBoxWidthPercentage"];
const BOOL_OPTIONS = ["stagger", "crunch", "links", "topLabel", "bottomLabel", "messageNumbering", "noteNumbering"];
const STRING_OPTIONS = ["picXSize", "picYSize", "vmlStyle", "vmlFont", "vmlTextSize", "vmlArrowStyle", "vmlDottedStyle", "vmlBoxStyle", "vmlTextStyle", "vmlBoxTextStyle"];

const BAD_INTS = ["", "x", " 3", "3x", "99999999999", "- 7"];
const BAD_BOOLS = ["maybe", "1", "on2"];
const STRING_VALUES = [" ", "-", "9pt", "bold", "fillcolor='blue'", "EndArrow='Open'", "DashStyle='dot'"];
const CHARS = "abcxyz01 ()<>!#&*.;:-^\\/=,%";

/** One caption: 0-80 characters built from the 4.5 parts (^, \/, (n), <, &, space). */
function caption(r) {
  const target = Math.floor(r() * 80);
  let s = "";
  while (s.length < target) {
    const k = r();
    let piece;
    if (k < 0.15) {
      piece = "^";
    } else if (k < 0.25) {
      piece = "\\/";
    } else if (k < 0.35) {
      piece = "(" + Math.floor(r() * 99) + ")";
    } else if (k < 0.45) {
      piece = "<";
    } else if (k < 0.55) {
      piece = "&";
    } else if (k < 0.65) {
      piece = " ";
    } else {
      piece = CHARS.charAt(Math.floor(r() * CHARS.length));
    }
    s += piece;
  }
  return s;
}

/**
 * Generate the fuzz cases.
 * @param {number} seed Seeded RNG start (4.5 rule 1).
 * @param {number} count How many cases.
 * @returns {Buffer[]} The case texts as UTF-8 bytes.
 */
export function genCases(seed, count) {
  const r = mulberry32(seed);
  const cases = [];
  for (let c = 0; c < count; c += 1) {
    const lines = [];
    const declared = [];
    const guys = Math.floor(r() * 7);
    for (let i = 0; i < guys; i += 1) {
      const alias = String.fromCharCode(97 + (i % 26));
      declared.push(alias);
      lines.push("guy/" + alias + "/" + caption(r));
    }
    const opts = Math.floor(r() * 5);
    for (let i = 0; i < opts; i += 1) {
      const kind = Math.floor(r() * 3);
      let name;
      let value;
      if (kind === 0) {
        name = INT_OPTIONS[Math.floor(r() * INT_OPTIONS.length)];
        value = r() < 0.9 ? String(Math.floor(r() * 40)) : BAD_INTS[Math.floor(r() * BAD_INTS.length)];
      } else if (kind === 1) {
        name = BOOL_OPTIONS[Math.floor(r() * BOOL_OPTIONS.length)];
        value = r() < 0.9 ? (r() < 0.5 ? "on" : "off") : BAD_BOOLS[Math.floor(r() * BAD_BOOLS.length)];
      } else {
        name = STRING_OPTIONS[Math.floor(r() * STRING_OPTIONS.length)];
        value = STRING_VALUES[Math.floor(r() * STRING_VALUES.length)];
      }
      lines.push("opt/" + name + "/" + value);
    }
    const body = Math.floor(r() * 31);
    for (let i = 0; i < body; i += 1) {
      const pool = declared.length > 0 ? declared : ["a", "b"];
      const pick = () => (r() < 0.05
        ? "z"
        : pool[Math.floor(r() * pool.length)]);
      const kind = r();
      if (kind < 0.45) {
        // arrow: 0-3 captions; zero captions means zero messages (3.1)
        const caps = Math.floor(r() * 4);
        let line = pick() + "->" + pick();
        for (let k = 0; k < caps; k += 1) {
          line += "/" + caption(r);
        }
        lines.push(r() < 0.1 ? "-" + line : line);
      } else if (kind < 0.55) {
        lines.push((r() < 0.1 ? "-" : "") + pick() + ".." + pick() + "/" + caption(r));
      } else if (kind < 0.65) {
        lines.push((r() < 0.1 ? "-" : "") + pick() + "--" + pick() + "/" + caption(r));
      } else if (kind < 0.75) {
        lines.push((r() < 0.1 ? "-" : "") + "note/" + pick() + "/" + caption(r));
      } else if (kind < 0.85) {
        lines.push((r() < 0.5 ? "!!" : "!") + caption(r));
      } else {
        lines.push(caption(r));
      }
    }
    // Shuffle: guy, opt and body lines can interleave (3.1 reads them in file order).
    for (let i = lines.length - 1; i > 0; i -= 1) {
      const j = Math.floor(r() * (i + 1));
      const t = lines[i];
      lines[i] = lines[j];
      lines[j] = t;
    }
    const end = r() < 0.05 ? "\r" : r() < 0.1 ? "\r\n" : "\n";
    cases.push(Buffer.from(lines.join(end) + (r() < 0.9 ? end : ""), "utf8"));
  }
  return cases;
}
