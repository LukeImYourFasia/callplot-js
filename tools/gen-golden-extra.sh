#!/bin/sh
# Golden files for the 6 legacy table styles and the prep converter (section 4.2 item 7).
# This replicates the plottable pipeline: jref -xml, then Xalan over the style's .xsl.
# plottable.sh itself is never run (section 5.4 rule 3).
# Never edit goldens by hand; rerun this script instead (section 5.4 rule 2).
set -u
cd "$(dirname "$0")/.."

export LC_ALL=en_US.UTF-8
export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

LIBDIR=reference/callplotwithextra/callplot/lib
XALAN_CP="$LIBDIR/xalan.jar:$LIBDIR/xml-apis.jar:$LIBDIR/xercesImpl.jar"
# The port's style "htmltable" is the archive's tmltable.xsl (section 3.13.2).
xsl_of() {
  if [ "$1" = htmltable ]; then echo "$LIBDIR/tmltable.xsl"; else echo "$LIBDIR/$1.xsl"; fi
}

# --- tables: 54 callplot inputs x 6 styles ---
for F in test/fixtures/*; do
  [ -f "$F" ] || continue
  case $F in *.trace) continue ;; esac
  NAME=$(basename "$F")

  # step 1: the 0.2 core, one process per run, stdout to a temporary XML file
  XML=$(mktemp)
  tools/jref.sh -xml "$F" > "$XML" 2> "test/golden/$NAME.table-xml.err"
  xml_exit=$?

  for S in archtable htmltable htmltable2 htmltable3 nolinks wordtable; do
    GOUT=test/golden/$NAME.table-$S.out
    GERR=test/golden/$NAME.table-$S.err
    GEXIT=test/golden/$NAME.table-$S.exit
    java -cp "$XALAN_CP" org.apache.xalan.xslt.Process -IN "$XML" -XSL "$(xsl_of "$S")" -OUT "$GOUT" 2> "$GERR"
    code=$?
    # "If the -xml step failed, record that exit code instead." (section 4.2)
    [ "$xml_exit" -ne 0 ] && code=$xml_exit
    [ -f "$GOUT" ] || : > "$GOUT"
    echo "$code" > "$GEXIT"
  done
  rm -f "$XML"
done

# --- prep: 4 packet traces, each in a fresh temporary folder (section 4.2) ---
ROOT=$(pwd)
for F in test/fixtures/*.trace; do
  [ -f "$F" ] || continue
  NAME=$(basename "$F" .trace)
  TMPD=$(mktemp -d)
  ( cd "$TMPD" && /usr/bin/awk -f "$ROOT/$LIBDIR/prep.awk" "$ROOT/$F" > "$ROOT/test/golden/$NAME.prep.out" ) \
    2> "test/golden/$NAME.prep.err"
  echo "$?" > "test/golden/$NAME.prep.exit"
  ( cd "$TMPD" && /usr/bin/awk -f "$ROOT/$LIBDIR/prep.awk" -v LINKS=y "$ROOT/$F" > "$ROOT/test/golden/$NAME.prep-links.out" ) \
    2> "test/golden/$NAME.prep-links.err"
  echo "$?" > "test/golden/$NAME.prep-links.exit"
  rm -f "$TMPD/debug"
  rm -rf "$TMPD"
done
