// @ts-check
// Section 3.12.2/3.12.3/3.12.5/3.12.6 unit tests: the link contract holds on
// every fixture and layout (link-integrity), user text is escaped (new_xss),
// and htmlLayout picks/validates per section 3.12.6.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { parse } from "../../src/index.js";
import { buildModel } from "../../src/ir.js";
import { pageOn } from "../../src/render/html/page.js";
import { Out } from "../../src/out.js";
import { escHtml } from "../../src/escape.js";

// node:assert has no contains in this Node line, so pin it locally
function contains(haystack, needle, msg = "") {
  assert.equal(haystack.includes(needle), true, (msg || "missing substring: ") + needle);
}

function containsNot(haystack, needle, msg = "") {
  assert.equal(haystack.includes(needle), false, (msg || "raw substring present: ") + needle);
}

function laidOut(name) {
  const f = parse(fs.readFileSync("test/fixtures/" + name, "utf8"));
  f.layout();
  return f;
}

// returns { model, html } with a nonempty idPrefix to exercise the {p} part
function page(name, opts) {
  const model = buildModel(laidOut(name));
  const out = new Out();
  pageOn(model, out, opts);
  return { model, html: out.toString() };
}

// collect id="..." and href="#..." from the page
function ids(html, kind) {
  const re = /id="([^"]+)"/g;
  const found = [];
  let m = re.exec(html);
  while (m !== null) {
    if (m[1].includes(kind)) {
      found.push(m[1]);
    }
    m = re.exec(html);
  }
  return found;
}

function hrefs(html, kind) {
  const re = /href="#([^"]+)"/g;
  const found = [];
  let m = re.exec(html);
  while (m !== null) {
    if (m[1].includes(kind)) {
      found.push(m[1]);
    }
    m = re.exec(html);
  }
  return found;
}

const FIXTURES = fs.readdirSync("test/fixtures").filter((n) => !n.endsWith(".trace"));

for (const layout of ["topbottom", "sidebyside"]) {
  test("[unit] html link-integrity: every fixture, " + layout, () => {
    for (const name of FIXTURES) {
      const prefix = "pfx-";
      let model;
      let html;
      try {
        const r = page(name, { htmlLayout: layout, idPrefix: prefix });
        model = r.model;
        html = r.html;
      } catch {
        continue; // crashing fixture: no page at all, pinned empty by the snapshot test
      }
      const flows = ids(html, "flow-");
      const details = ids(html, "detail-");
      const expectedFlow = model.events.map((e) => prefix + "flow-" + e.id);
      const expectedDetail = model.events.map((e) => prefix + "detail-" + e.id);
      assert.deepEqual(flows, expectedFlow, "flow ids for " + name);
      assert.deepEqual(details, expectedDetail, "detail ids for " + name);
      // every event group carries a badge link to its row...
      const badges = hrefs(html, "detail-");
      assert.deepEqual(badges, expectedDetail, "badge hrefs for " + name);
      // ...and every row carries one back link to its event
      const backs = hrefs(html, "flow-");
      assert.deepEqual(backs, expectedFlow, "back hrefs for " + name);
      // group classes cover exactly the events and kinds
      for (const e of model.events) {
        const kindClass = e.kind === "mediaRepeat" ? "media" : e.kind;
        contains(
          html,
          `<g class="ev ev-${kindClass}" id="${prefix}flow-${e.id}">`,
          "event group for " + e.id + " in " + name
        );
      }
    }
  });
}

test("[unit] html new_xss: user text only ever appears escaped", () => {
  const { model, html } = page("new_xss", { htmlLayout: "topbottom" });
  const strings = [];
  for (const p of model.participants) {
    strings.push(...p.label);
  }
  for (const e of model.events) {
    strings.push(...e.caption, ...e.notes, ...e.comments);
  }
  for (const s of strings) {
    if (!/[&<>"']/.test(s)) {
      continue;
    }
    containsNot(html, s, "raw user string not escaped: " + s);
    contains(html, escHtml(s), "escaped form missing for " + s);
  }
});

test("[unit] html htmlLayout: bad file value and bad API value both throw", () => {
  const bad = parse("opt/htmlLayout/tornado\nguy/A/A\n");
  bad.layout();
  const out = new Out();
  let err = null;
  try {
    pageOn(buildModel(bad), out, {});
  } catch (e) {
    err = e;
  }
  assert.equal(err === null, false, "file value must throw");
  assert.equal(err.constructor.name, "IllegalArgumentError");
  assert.equal(err.message, "Bad value for htmlLayout option");
  assert.equal(out.toString(), "", "nothing written before the throw");

  const g = parse("guy/A/A\nguy/B/B\nA->B/x\n");
  g.layout();
  const out2 = new Out();
  let err2 = null;
  try {
    pageOn(buildModel(g), out2, { htmlLayout: "topbottim" });
  } catch (e) {
    err2 = e;
  }
  assert.equal(err2 === null, false, "API value must throw");
  assert.equal(err2.message, "Bad value for htmlLayout option");
});

test("[unit] html htmlLayout precedence: API option beats the input file", () => {
  const f = parse("opt/htmlLayout/topbottom\nguy/A/A\n");
  f.layout();
  const out = new Out();
  pageOn(buildModel(f), out, { htmlLayout: "sidebyside" });
  const html = out.toString();
  contains(html, 'id="lay-sbs" class="cpf-radio" checked');
  containsNot(html, 'id="lay-tb" class="cpf-radio" checked');
});

test("[unit] html page shape: doctype, structure, one trailing newline", () => {
  const out = new Out();
  const f = parse("guy/A/A\nguy/B/B\nA->B/hi\nB->A/yo");
  f.layout();
  pageOn(buildModel(f), out, {});
  const html = out.toString();
  contains(html, "<!doctype html>\n<html lang=\"en\">");
  contains(html, '<div class="cpf">');
  contains(html, '<section class="cpf-flow" aria-label="Diagram"><div class="cpf-scroll">');
  contains(html, '<section class="cpf-detail" aria-label="Details"><div class="cpf-tscroll">');
  assert.equal(html.endsWith("</html>\n"), true);
  contains(html, "<p>2 participants · 2 events</p>");
  contains(html, "<title>Call flow</title>");
});

test("[unit] html title: input opt/title escapes in title and h1, default Call flow", () => {
  const f = parse("opt/title/A & B <b> \"q\"\nguy/A/A\n");
  f.layout();
  const out = new Out();
  pageOn(buildModel(f), out, {});
  const html = out.toString();
  contains(html, "<title>A &amp; B &lt;b&gt; &quot;q&quot;</title>");
  contains(html, "<h1>A &amp; B &lt;b&gt; &quot;q&quot;</h1>");
  containsNot(html, "<b>");
});
