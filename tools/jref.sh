#!/bin/sh
exec java -cp "$(dirname "$0")/../reference/build" com.dynamicsoft.callplot.Main "$@"
