// @ts-check
// Section 3.9: IR unit tests. Kinds and ids are exercised on inline text;
// the numbering rule and the no-mutation rule run against s_sip_annot and
// its XML golden.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { parse } from "../../src/parser.js";
import { buildModel } from "../../src/ir.js";
import { MODES } from "../../src/constants.js";
import { Out } from "../../src/out.js";
import { plotOn } from "../../src/render/text.js";

function laidOut(name) {
  const f = parse(fs.readFileSync("test/fixtures/" + name, "utf8"));
  f.layout();
  return f;
}

test("[unit] ir kinds: every kind rule, first match wins", () => {
  const text = [
    "guy/A/A",
    "guy/B/B",
    "guy/N/N",
    "A->B/msg", // message
    "A->B/req/resp", // resp: alternating reply
    "A--B/repeat", // mediaRepeat (--)
    "A..B/media", // media (..)
    "A->A/selfmsg", // self (directed, from === to)
    "note/N/note", // note
    "B..B/selfmedia" // a..a/x is a note too, as in Java
  ].join("\n");
  const f = parse(text);
  f.layout();
  const model = buildModel(f);
  assert.deepEqual(model.events.map((e) => e.kind), [
    "message",
    "message",
    "reply",
    "mediaRepeat",
    "media",
    "self",
    "note",
    "note"
  ]);
});

test("[unit] ir ids: e1.. in event order, never options", () => {
  const text = "guy/A/A\nguy/B/B\nA->B/x\n";
  const plain = parse(text);
  plain.layout();
  const numbered = parse("opt/messageNumbering/on\n" + text);
  numbered.layout();
  const m1 = buildModel(plain);
  const m2 = buildModel(numbered);
  assert.deepEqual(m1.events.map((e) => e.id), ["e1"]);
  assert.deepEqual(m2.events.map((e) => e.id), ["e1"]);
  assert.equal(m1.events[0].num, null);
  assert.equal(m2.events[0].num, 1);
});

test("[unit] ir num rule: messageNumbering && (from !== to || noteNumbering)", () => {
  const text = [
    "guy/A/A",
    "guy/B/B",
    "guy/N/N",
    "opt/messageNumbering/on",
    "A->B/msg", // numbered
    "note/N/note", // from === to, noteNumbering off -> null
    "A--B/repeat", // numbered
    "A->A/selfmsg" // from === to -> null
  ].join("\n");
  const f = parse(text);
  f.layout();
  assert.deepEqual(buildModel(f).events.map((e) => e.num), [1, null, 2, null]);

  const noteF = parse("opt/noteNumbering/on\n" + text);
  noteF.layout();
  assert.deepEqual(buildModel(noteF).events.map((e) => e.num), [1, 2, 3, 4]);

  // noteNumbering alone numbers nothing
  const offF = parse("guy/A/A\nguy/B/B\nguy/N/N\nopt/noteNumbering/on\nA->B/msg\nnote/N/note\n");
  offF.layout();
  assert.deepEqual(buildModel(offF).events.map((e) => e.num), [null, null]);
});

test("[unit] ir no player named: throws IllegalArgumentError like columnOf", () => {
  const f = parse("guy/a/A\nx->y/c\n");
  f.layout();
  assert.throws(() => buildModel(f), /no player named x/);
});

test("[unit] ir srcLine and isReply: parser sets them for the IR", () => {
  const f = parse("guy/a/A\nguy/b/B\na->b/one/two\nnote/a/n\na..b/m\n");
  f.layout();
  // lines: 1 guy, 2 guy, 3 arrow (2 messages), 4 note, 5 media
  assert.deepEqual(f.messages.map((m) => m.srcLine), [3, 3, 4, 5]);
  assert.deepEqual(f.messages.map((m) => m.isReply), [false, true, false, false]);
});

test("[unit] ir buildModel does not change Flow: TEXT twice", () => {
  const f = laidOut("s_sip_annot");
  const o1 = new Out();
  plotOn(f, o1, MODES.TEXT);
  buildModel(f);
  const o2 = new Out();
  plotOn(f, o2, MODES.TEXT);
  assert.equal(o1.toString(), o2.toString(), "TEXT before and after buildModel differ");
});

test("[unit] ir sip_annot numbers 1-13 match the XML golden", () => {
  const f = laidOut("s_sip_annot");
  const model = buildModel(f);
  assert.equal(model.events.length, 15);
  const nums = model.events.filter((e) => e.num !== null).map((e) => e.num);
  assert.deepEqual(nums, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const xml = fs.readFileSync("test/golden/s_sip_annot.xml.out", "utf8");
  const goldenNums = [];
  const linkRe = /<a href='#t(\d+)'>/g;
  let mm = linkRe.exec(xml);
  while (mm !== null) {
    goldenNums.push(Number(mm[1]));
    mm = linkRe.exec(xml);
  }
  assert.deepEqual(goldenNums, nums, "IR numbers must match XML link numbers");
});
