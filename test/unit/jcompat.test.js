// @ts-check
// Unit tests for jcompat helpers (section 3.5).
// fmtD rows and javaSplit edge cases were confirmed on OpenJDK 1.8.0_504.
import { test } from "node:test";
import assert from "node:assert";
import {
  fmtI, fmtD, idiv, parseJavaInt, javaTrim, javaSplit, tokenize, CharBuf,
  CallplotError, NumberFormatError, IndexError,
  ArithmeticError, NegativeArraySizeError
} from "../../src/jcompat.js";

test("[unit] fmtI prints integers with no decimal point", () => {
  assert.equal(fmtI(0), "0");
  assert.equal(fmtI(-42), "-42");
  assert.equal(fmtI(1000001), "1000001");
  assert.throws(() => fmtI(1.5), CallplotError);
});

test("[unit] fmtD matches the section 3.5 table (all rows confirmed on Java 8)", () => {
  const cases = [
    [50, "50.0"],
    [0, "0.0"],
    [-0, "-0.0"],
    [10.2, "10.2"],
    [-0.4, "-0.4"],
    [1.6 * 2 * 14, "44.800000000000004"],
    [0.001, "0.001"],
    [0.0001, "1.0E-4"],
    [9999999, "9999999.0"],
    [1e7, "1.0E7"],
    [12345678, "1.2345678E7"],
    [1 / 0, "Infinity"],
    [-Infinity, "-Infinity"],
    [NaN, "NaN"],
    // extra values confirmed against the reference JVM
    [0.2 + 15, "15.2"],
    [-0.2 + 9, "8.8"],
    [1.6 * 3 * 14, "67.20000000000002"],
    [16.0 / 6 + 0.25, "2.9166666666666665"],
    [-1 * 21 / 6, "-3.5"]
  ];
  for (const [x, want] of cases) {
    assert.equal(fmtD(x), want, "fmtD(" + x + ")");
  }
});

test("[unit] idiv truncates toward zero and throws on /0", () => {
  assert.equal(idiv(7, 2), 3);
  assert.equal(idiv(-7, 2), -3);
  assert.equal(idiv(14 * 100, 100), 14);
  assert.throws(
    () => idiv(1, 0),
    (e) => e instanceof ArithmeticError && /\/ by zero/.test(e.message)
  );
});

test("[unit] parseJavaInt is strict; Java 8 accepts +5", () => {
  assert.equal(parseJavaInt("5"), 5);
  assert.equal(parseJavaInt("+5"), 5);
  assert.equal(parseJavaInt("-5"), -5);
  assert.equal(parseJavaInt("0"), 0);
  assert.equal(parseJavaInt("2147483647"), 2147483647);
  assert.equal(parseJavaInt("-2147483648"), -2147483648);
  assert.throws(() => parseJavaInt("2147483648"), NumberFormatError);
  assert.throws(() => parseJavaInt(" 5"), NumberFormatError);
  assert.throws(() => parseJavaInt("5 "), NumberFormatError);
  assert.throws(() => parseJavaInt(""), NumberFormatError);
  assert.throws(() => parseJavaInt("5.0"), NumberFormatError);
  assert.throws(() => parseJavaInt("0x5"), NumberFormatError);
});

test("[unit] javaTrim strips only code points <= 0x20", () => {
  assert.equal(javaTrim(" \t x \r\n"), "x");
  assert.equal(javaTrim("\u00a0x\u00a0"), "\u00a0x\u00a0"); // NBSP kept
  assert.equal(javaTrim("a b"), "a b");
  assert.equal(javaTrim("\u0000x"), "x");
});

test("[unit] javaSplit follows Java exactly (edge cases probed on Java 8)", () => {
  const slash = /(?<=[^\\])\//;
  assert.deepEqual(javaSplit("a->b/x/y", slash), ["a->b", "x", "y"]);
  assert.deepEqual(javaSplit("a->b/x\\/y", slash), ["a->b", "x\\/y"]);
  assert.deepEqual(javaSplit("guy/a/", slash), ["guy", "a"]); // trailing dropped
  assert.deepEqual(javaSplit("/", slash), ["/"]);  // pos 0 never splits
  assert.deepEqual(javaSplit("//", slash), ["/"]); // pos 0 never splits
  assert.deepEqual(javaSplit("///", slash), ["/"]);
  const plain = /\//;
  assert.deepEqual(javaSplit("a/b/c", plain), ["a", "b", "c"]);
  assert.deepEqual(javaSplit("a/b/", plain), ["a", "b"]);
  assert.deepEqual(javaSplit("//", plain), []);   // Java length-0 array
  assert.deepEqual(javaSplit("/", plain), []);
  assert.deepEqual(javaSplit("/a", plain), ["", "a"]);
  assert.deepEqual(javaSplit("a//b", plain), ["a", "", "b"]);
  assert.deepEqual(javaSplit("abc", plain), ["abc"]); // no match -> [s]
  assert.deepEqual(javaSplit("", plain), [""]);
});

test("[unit] tokenize mimics StringTokenizer(s, \"^\"): empties dropped", () => {
  assert.deepEqual(tokenize("^^a^"), ["a"]);
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("a^b"), ["a", "b"]);
  assert.deepEqual(tokenize("x^^y"), ["x", "y"]);
});

test("[unit] CharBuf throws IndexError outside [0,width)", () => {
  const b = new CharBuf(3);
  b.set(0, "x");
  assert.equal(b.get(0), "x");
  assert.throws(() => b.get(3), IndexError);
  assert.throws(() => b.get(-1), IndexError);
  assert.throws(() => b.set(3, "y"), IndexError);
  assert.throws(() => new CharBuf(-1), NegativeArraySizeError);
});

test("[unit] CharBuf.copyIn checks the whole range before writing", () => {
  const b = new CharBuf(4);
  b.copyIn("ab", 1, 2); // legal: fills indices 1..2
  assert.throws(() => b.copyIn("abcd", 1, 4), IndexError); // 1+4 > 4
  assert.throws(() => b.copyIn("ab", -1, 2), IndexError);
  assert.throws(() => b.copyIn("ab", 0, -1), IndexError);
});
