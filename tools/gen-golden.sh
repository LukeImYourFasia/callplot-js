#!/bin/sh
# Regenerate all golden files from the Java reference.
# Never edit goldens by hand; rerun this script instead (section 5.3).
set -u
cd "$(dirname "$0")/.."

export LC_ALL=en_US.UTF-8
export JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8

MODES="text xml pic svg vml vxml graffle"

run() {
  tools/jref.sh "$@" > "$GOUT" 2> "$GERR"
  echo "$?" > "$GEXIT"
}

# fixture x mode (section 4.3: a .trace is not callplot input; it gets no core goldens)
for F in test/fixtures/*; do
  [ -f "$F" ] || continue
  case $F in *.trace) continue ;; esac
  NAME=$(basename "$F")
  for M in $MODES; do
    GOUT=test/golden/$NAME.$M.out
    GERR=test/golden/$NAME.$M.err
    GEXIT=test/golden/$NAME.$M.exit
    if [ "$M" = text ]; then
      run "$F"
    else
      run "-$M" "$F"
    fi
  done
done

# CLI cases: test/cli/*.json list args and an optional stdin fixture.
mkdir -p test/golden/cli
for J in test/cli/*.json; do
  [ -f "$J" ] || continue
  NAME=$(basename "$J" .json)
  # print expanded args, one per line; stdin fixture on a STDIN: line
  node -e '
    const fs = require("fs");
    const c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const expand = a => (a !== "-" && fs.existsSync("test/fixtures/" + a)) ? "test/fixtures/" + a : a;
    c.args.map(expand).forEach(a => console.log(a));
    if (c.stdin) console.log("STDIN:" + c.stdin);
  ' "$J" > /tmp/opencode/cli-args.$$

  set --
  STDIN=/dev/null
  while IFS= read -r line; do
    case $line in
      STDIN:*) STDIN=test/fixtures/${line#STDIN:} ;;
      *) set -- "$@" "$line" ;;
    esac
  done < /tmp/opencode/cli-args.$$
  rm -f /tmp/opencode/cli-args.$$

  GOUT=test/golden/cli/$NAME.out
  GERR=test/golden/cli/$NAME.err
  GEXIT=test/golden/cli/$NAME.exit
  run "$@" < "$STDIN"
done
