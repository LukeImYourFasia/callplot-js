// @ts-check
// Unit tests for the parser state machine (sections 3.1, 3.2).
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { parse } from "../../src/parser.js";
import { IndexError, NullPointerError } from "../../src/jcompat.js";

function readFixture(name) {
  return fs.readFileSync("test/fixtures/" + name, "utf8");
}

test("[unit] s_fred: 2 players, 6 messages with correct flags", () => {
  const f = parse(readFixture("s_fred"));
  assert.equal(f.players.length, 2);
  assert.deepEqual(f.players[0].name, "f");
  assert.deepEqual(f.players[0].caption, ["Fred"]);
  assert.deepEqual(f.players[1].caption, ["Barney"]);
  assert.equal(f.messages.length, 6);
  const [p, n, s, r, t, w] = f.messages;
  assert.deepEqual([p.from, p.to, p.filler, p.arrowFrom, p.arrowTo], ["f", "b", "-", false, true]);
  assert.deepEqual([n.from, n.to, n.filler, n.arrowFrom, n.arrowTo], ["b", "b", " ", false, false]);
  assert.deepEqual([r.from, r.to, r.filler], ["b", "f", "."]);
  assert.equal(r.repeatLabel, false);
  assert.deepEqual([t.from, t.to, t.filler], ["f", "b", "-"]); // Thank You
  assert.equal(w.arrowTo, true);
  assert.deepEqual([w.from, w.to], ["b", "f"]); // You're Welcome
  assert.deepEqual(w.caption, ["You're Welcome"]);
  assert.deepEqual(t.caption, ["Thank You"]);
  assert.deepEqual(r.caption, ["RTP"]);
  assert.deepEqual(s.caption, ["Stuff"]);
  assert.deepEqual(n.caption, ["Gives bowling ball"]);
});

test("[unit] dummy_prefix: hidden note-line dummy carries to next message", () => {
  const f = parse(readFixture("dummy_prefix"));
  assert.deepEqual(f.messages.map(m => m.caption[0]), ["shown", "next", "after"]);
  const shown = f.messages[0];
  assert.deepEqual(shown.comments, ["lost"]);
  assert.deepEqual(shown.notes, []);
  // hidnote was created with dummy and never pushed; its comment/note lost
});

test("[unit] dummy_on_guy: '-' on guy line hides the NEXT message", () => {
  const f = parse(readFixture("dummy_on_guy"));
  assert.deepEqual(f.players.map(p => p.name), ["c", "a", "b"]);
  assert.deepEqual(f.messages.map(m => m.caption[0]), ["y"]);
});

test("[unit] escapes: backslash-slash survives inside a field", () => {
  const f = parse(readFixture("escapes"));
  const m = f.messages[0];
  assert.deepEqual(m.caption, ["GET home/away"]);
  assert.deepEqual(f.messages[1].caption, ["200 OK"]);
  assert.deepEqual([f.messages[1].from, f.messages[1].to], ["b", "a"]); // reply swaps
  assert.deepEqual(f.messages[2].caption, ["x/y"]); // note/b/x\/y
  assert.equal(f.opts.get("vmlBoxStyle"), "fillcolor='blue'");
});

test("[unit] consecutive_slash: empty first caption kept", () => {
  const f = parse(readFixture("consecutive_slash"));
  assert.equal(f.messages.length, 2);
  assert.deepEqual(f.messages[0].caption, []); // empty caption field digests to no tokens
  assert.deepEqual(f.messages[1].caption, ["second"]);
});

test("[unit] missing_field: guy/a/ throws IndexError", () => {
  assert.throws(() => parse(readFixture("missing_field")), IndexError);
});

test("[unit] comment_first: !/!! before any message throws NullPointerError", () => {
  assert.throws(() => parse(readFixture("comment_first")), NullPointerError);
});

test("[unit] leading_ws: whitespace disables guy but not arrow lines", () => {
  const f = parse(readFixture("leading_ws"));
  assert.deepEqual(f.players.map(p => p.name), ["b", "c"]); // "  guy" never matches
  assert.equal(f.messages.length, 1);
  assert.deepEqual([f.messages[0].from, f.messages[0].to], ["b", "c"]);
});

test("[unit] no_caption: arrow line without fields creates no message", () => {
  const f = parse(readFixture("no_caption"));
  assert.equal(f.messages.length, 0);
});

test("[unit] caret_edges: StringTokenizer drops empty tokens", () => {
  const f = parse(readFixture("caret_edges"));
  assert.deepEqual(f.players[0].caption, ["A"]);
  assert.deepEqual(f.messages[0].caption, ["x", "y"]);
  assert.deepEqual(f.messages[0].captionString, "x\" \"y");
});

test("[unit] option_case: last put wins; option names case-sensitive", () => {
  const f = parse(readFixture("option_case"));
  assert.equal(f.opts.get("columnPitch"), "14");
  assert.equal(f.opts.has("picXsize"), true); // lower-case s: unknown option, kept
  assert.equal(f.opts.has("picXSize"), false);
});

test("[unit] opt values are not trimmed (bad_int keeps ' 3')", () => {
  const f = parse(readFixture("bad_int"));
  assert.equal(f.opts.get("linePitch"), " 3");
});

test("[unit] crlf and cr_only parse like s_fred", () => {
  for (const name of ["crlf", "cr_only"]) {
    const f = parse(readFixture(name));
    assert.equal(f.players.length, 2);
    assert.equal(f.messages.length, 6);
  }
});

test("[unit] self_msg: self arrow keeps arrowTo and isSelf predicate", () => {
  const f = parse(readFixture("self_msg"));
  const m = f.messages[0];
  assert.deepEqual([m.from, m.to], ["a", "a"]);
  assert.deepEqual([m.arrowFrom, m.arrowTo], [false, true]);
});

test("[unit] dashdash: -- sets repeatLabel, .. does not; both filler '.'", () => {
  const f = parse(readFixture("dashdash"));
  assert.deepEqual(f.messages.map(m => [m.from, m.to, m.repeatLabel, m.filler]), [
    ["a", "d", true, "."],
    ["b", "c", true, "."],
    ["a", "d", false, "."]
  ]);
  assert.deepEqual(f.messages[1].caption, ["x", "y"]);
});

test("[unit] s_fred_annot: notes/comments attach to the last message", () => {
  const f = parse(readFixture("s_fred_annot"));
  const please = f.messages[0];
  assert.deepEqual(please.comments, ['Fred: "Please"']);
  assert.deepEqual(please.notes, ["Fred is asking Barney for his bowling ball nicely."]);
  assert.equal(f.opts.get("messageNumbering"), "on");
  assert.equal(f.opts.get("links"), "on");
});

test("[unit] one 100,000-character line parses in under 1 s (2.5 #6.16)", () => {
  const text = "guy/a/A\nguy/b/B\na->b/" + "x".repeat(100000) + "\n";
  const t0 = Date.now();
  parse(text);
  assert.equal(Date.now() - t0 < 1000, true, "parse time under 1 s");
});
