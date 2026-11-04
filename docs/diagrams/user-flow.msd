opt/messageNumbering/on
opt/links/on
opt/title/How a user drives callplot
guy/u/You
guy/c/callplot
guy/t/Terminal
guy/p/fred.html
guy/b/Browser
u->c/write a flow file, run callplot fred/exit 0
c->t/the ASCII art diagram
u->c/run callplot -html fred > fred.html/exit 0
c->p/a drawn page written to a file
u->b/open fred.html
b->u/drawn diagram with a linked detail table
note/u/-mermaid and -plantuml give text to paste into markdown
