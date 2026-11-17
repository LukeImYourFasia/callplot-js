---
name: Design to msd
description: Scan a design document, extract a call/message flow from it, and write a callplot .msd file. Render the flow as a diagram; by default a top-bottom HTML page (-html). Use for any "turn this design doc into a call diagram / msd" task.
---

# Design to msd

Turn a design document (a spec, a protocol write-up, a plan) into callplot
inputs and diagrams. Run every command from the repo root. Invoke the CLI as
`node bin/callplot.js` (committed files are not executable).

## Workflow

1. **Pick the flow.** If the user names a flow, use it. Otherwise scan the
   document and take the first described call flow: an exchange between
   named participants over time (requests, replies, notes, side channels).
   Two kinds of source:
   - A **verbatim msd block** already in the document (a fenced block with
     `guy/...` lines): copy it exactly, do not retype or reflow it.
   - A **prose description**: map it to msd lines with the grammar in
     `references/msd-grammar.md`.
2. **Write the msd** to `docs/diagrams/<slug>.msd`, `<slug>` = lowercase
   kebab-case name of the flow. Unless the document says otherwise, start the
   file with `opt/messageNumbering/on`, `opt/links/on`, and
   `opt/title/<Title Case flow name>` so the diagram and its tables get rows
   and links.
3. **Validate:** `node bin/callplot.js docs/diagrams/<slug>.msd > /dev/null`
   must exit 0. Fix the msd (never the tools) on any error, then re-run.
4. **Render the default output** — a top-bottom HTML page:
   `node bin/callplot.js -html docs/diagrams/<slug>.msd > docs/diagrams/<slug>.html-topbottom.html`
   (exit 0 required). Tell the user to open that file in a browser.
5. Only if the user asks for other outputs, render them with the flags
   `references/msd-grammar.md` lists (`-txt` default, `-pic`, `-xml`, `-svg`,
   `-graffle`, `-table[=style]`, `-mermaid`, `-plantuml`,
   `-html=sidebyside`, ...).
6. **Format fit.** `-html` is the drawn page: colors, links, and `!`/`!!`
   annotations drawn in a detail table. Mermaid and PlantUML are text
   formats: annotations become source comments (`%%` / `'`) that are NOT
   drawn, there is no wrapping or table, and long captions widen the
   diagram. If the user wants mermaid or plantuml, also write a slim
   variant `<slug>-slim.msd`: 6 participants or fewer, one-line labels,
   captions under 40 characters, `!!` details folded into `note/` lines.

## Rules

- Never write into `test/`, `samples/`, `reference/`, or `tools/`: those hold
  goldens, snapshots, and the oracle. Generated diagrams go under
  `docs/diagrams/`.
- Do not commit generated diagrams unless the user asks; the skill file
  itself is committed.
- If the flow came from a verbatim block, byte-verify the copy:
  the msd file must equal the block exactly (`cmp` against the extracted
  block).
- If the same flow already has an approved reference output
  (e.g. `samples/reference/<sample>/`), byte-compare your `-html` output
  against it; a mismatch means the msd drifted — fix the msd, not the tools.
