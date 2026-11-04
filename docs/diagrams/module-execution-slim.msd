opt/messageNumbering/on
opt/links/on
opt/title/One callplot run through the modules
guy/u/User
guy/c/CLI
guy/r/render
guy/f/Flow
guy/i/IR
guy/h/renderers
u->c/callplot -html fred/exit 0
c->c/read argv, files, stdin
c->r/text, mode, opts, ctx
r->f/parse, options, layout
f->r/laid out Flow
f->h/picture: text, pic, svg, vml, graffle, tables
h->r/picture string
f->i/buildModel after layout
i->h/title, participants, events
h->r/SVG page with linked table
h->c/write stdout
note/f/numbering and position math live here
note/h/jcompat.js gives Java semantics everywhere
