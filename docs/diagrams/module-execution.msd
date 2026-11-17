opt/messageNumbering/on
opt/links/on
opt/title/One callplot run through all modules
guy/u/User^terminal
guy/c/CLI^bin\/callplot.js
guy/r/render^src\/index.js
guy/p/parse^src\/parser.js
guy/f/Flow^src\/flow.js
guy/i/buildModel^src\/ir.js
guy/h/renderers^src\/render
guy/o/Out^src\/out.js
u->c/callplot -html fred/exit 0
c->c/read argv, files, stdin
c->r/text, mode, opts, RunContext
r->p/parse the text
p->f/players, messages, options
f->f/apply options, layout, numbering
f->r/Flow laid out
f->h/Flow direct: text, pic, svg, vml, graffle, tables
h->r/picture string
f->i/buildModel(flow) after layout
i->h/title, participants, events
h->r/SVG diagram plus linked detail table
r->o/print and println into Out
o->c/buffered bytes
c->u/fred.html on stdout, exit 0
note/c/RunContext is shared by every file in one run
note/r/jcompat.js supplies Java semantics to all modules above
i..h/mermaid and plantuml read the IR too, like HTML does
