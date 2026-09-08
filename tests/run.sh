#!/bin/sh
# Run the QuickSmith regression suite headlessly.
#
#   ./tests/run.sh              summary
#   ./tests/run.sh --verbose    every check
#   ./tests/run.sh --json       machine-readable
#
# Uses node if it is installed, otherwise macOS's built-in JavaScriptCore shell
# (jsc), so this needs no toolchain at all on a Mac.

set -e
cd "$(dirname "$0")/.."

JSC="/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

if command -v node >/dev/null 2>&1; then
    exec node tests/run.js "$@"
elif [ -x "$JSC" ]; then
    exec "$JSC" tests/run.js -- "$@"
else
    echo "No JavaScript engine found." >&2
    echo "Install node, or open tests/index.html in a browser instead." >&2
    exit 2
fi
