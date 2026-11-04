# msd grammar (callplot input language)

One command per line; fields are separated by `/` (write `\/` for a literal
`/`). `^` inside a label or caption starts a new display line. A line
starting with a space is NOT parsed as a `guy`, `note`, or `opt` line (an
original-tool quirk): never indent these lines.

| Line | Meaning |
|---|---|
| `guy/a/Alice^UA` | Participant with short name (alias) `a`, display label `Alice` (second line `UA`). Aliases are 1–2 chars. |
| `a->b/INVITE` | Arrow (message) from `a` to `b`. |
| `a->b/INVITE/200 OK` | Request and reply: each extra field flips the direction, so `200 OK` is `b->a`. |
| `a..b/RTP` | Dotted line, no arrowhead (media stream, side channel). |
| `a--b/RTP` | Dotted line (OmniGraffle repeats the label in each column). |
| `a->a/Hold timer` | Self-message on `a`'s lifeline. |
| `note/b/Phone rings` | A note pinned to `b`'s lifeline, between messages. |
| `!text` | Comment on the last message: shown in the "Notes" column of tables only. |
| `!!text` | Detail on the last message: shown with the caption in tables. |
| `-a->b/X` | Hide this message (the next message only). Also works on `guy`/`note` lines. |
| `opt/name/value` | Set an option (table below). |
| `# text` | Comment line, ignored. |

Unknown aliases on arrow lines are an error; a missing final field is an
error. Every participant must be declared with `guy/` before its first use.

## Options (defaults)

| Option | Default | Effect |
|---|---|---|
| `messageNumbering` | off | Number messages: `(1) INVITE`. Table rows exist ONLY for numbered messages, so turn it on before using `-table` or `-html`. |
| `noteNumbering` | off | Also number notes and self-messages. |
| `columnPitch` | 10 | Characters between lifelines (text mode). |
| `linePitch` | 4 | Blank lines between messages. |
| `crunch` | off | Remove empty lines. |
| `stagger` | off | Offset alternating label boxes (SVG, VML, Graffle). |
| `topLabel` / `bottomLabel` | on / off | Participant labels at the top / bottom. |
| `links` | on | Diagram links used by table and HTML outputs. |
| `title` | — | Title for Mermaid, PlantUML, and HTML. |
| `htmlLayout` | `topbottom` | `topbottom` or `sidebyside` for `-html`. |

Booleans accept `on/off`, `yes/no`, `true/false`. DESIGN.md section 3.3 lists
every option; see 3.13 (tables) and 3.14 (trace conversion) for details.

## Prose -> msd mapping

- Named actors, roles, modules, endpoints in the document become `guy/` lines,
  in the order the reader first meets them, aliases `a`, `b`, `c`, ...
- Ordered interactions become arrow lines in reading order. A response or
  "returns" sentence is either an extra field on the same line (request/reply)
  or its own reverse arrow, whichever the document implies.
- Background/side channels, streams, and notifications -> `..`.
- Preconditions, caveats, in-line remarks -> `note/` or `!`/`!!` on the nearest
  message. Source citations ("see section 3.2") fit best as `!` comments.
- Events the document says are internal to one component -> self-messages
  `a->a/...`.

## Table/HTML escaping

In table (`-table`) output, a raw `<` or `&` inside captions/annotations is an
error (as in the original tool): write `&lt;` and `&amp;`. The new outputs
(`-html`, `-mermaid`, `-plantuml`) escape text for you.

## Rendering flags (node bin/callplot.js)

(no flag)=ASCII art, `-pic`, `-xml`, `-vml`, `-vxml`, `-svg`, `-graffle`,
`-table[=archtable|htmltable|htmltable2|htmltable3|nolinks|wordtable]`,
`-mermaid`, `-plantuml`, `-html[=topbottom|sidebyside]`. A flag applies to
every file after it. Exit code must be 0 for every render.
