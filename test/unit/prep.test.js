// @ts-check
// Section 3.14: prep unit tests — awkNum must copy awk's %.6g OFMT printing
// for the value range this program produces, and quirk 4 (dash rules fall
// through to the ! comment rule) is pinned here; goldens pin the rest.
import { test } from "node:test";
import assert from "node:assert";
import { prep, awkNum } from "../../src/prep/prep.js";

// node:assert in this Node line has no contains, pin it locally
function contains(haystack, needle) {
  assert.equal(haystack.includes(needle), true, "missing substring: " + needle);
}

test("[unit] awkNum copies awk's %.6g printing in the time range", () => {
  assert.equal(awkNum(0.12), "0.12"); // 0.12000000000000001 style artifacts fold
  assert.equal(awkNum(0.45 - 0.12), "0.33"); // binary subtraction artifact
  assert.equal(awkNum(36000), "36000"); // whole numbers print bare
  assert.equal(awkNum(0), "0");
  assert.equal(awkNum(86400.0000001), "86400"); // 6 significant digits fold
  assert.equal(awkNum(-0.5), "-0.5");
});

test("[unit] prep quirk 4: -INVITE packet also prints as a ! comment", () => {
  const trace = [
    "@ 10.0.0.1 alice",
    "@ 10.0.0.2 bob",
    "Date 11/05/2026 10:00:00.000",
    "Source Address: 10.0.0.1",
    "Destination Address: 10.0.0.2",
    "-INVITE x SIP/2.0"
  ].join("\n");
  const r = prep(trace, {});
  contains(r.out, "-alice->bob/INVITE");
  contains(r.out, "!-INVITE x SIP/2.0");
});

test("[unit] prep: first packet's from-last line shows the whole time of day", () => {
  const trace = [
    "Date 11/05/2026 10:00:00.500",
    "GET /x HTTP/1.1"
  ].join("\n");
  const r = prep(trace, {});
  // no Source/Destination lines: s and d stay ""; toTime ignores the day
  // parts and uses hh*3600 + mm*60 + ss + ms/1000
  contains(r.out, "!!    0 from initial");
  contains(r.out, "!!    36000.5 from last");
});

test("[unit] prep: INFO matches INFORMATION (quirk 3)", () => {
  const trace = [
    "Date 11/05/2026 10:00:00.000",
    "INFORMATION over wire"
  ].join("\n");
  const r = prep(trace, {});
  // $1 = "INFORMATION" starts with INFO -> rule 8 fires with s/d ""
  contains(r.out, "->/INFORMATION");
  contains(r.out, "!INFORMATION over wire");
});
