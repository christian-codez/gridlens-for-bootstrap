#!/usr/bin/env bash
#
# Builds the store submission zip.
#
# Two things this gets right that are easy to get wrong by hand:
#   - manifest.json ends up at the ZIP ROOT, not inside a nested folder.
#     Both stores reject a zip of the containing directory.
#   - Only shipped files go in. No .git, no docs/, no demo/, no README.
#
# Usage: ./package.sh

set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
NAME="gridlens-for-bootstrap-v${VERSION}.zip"
OUT="dist/${NAME}"

# Files that actually ship in the extension.
FILES=(
  manifest.json
  background.js
  content.js
  injected.js
  popup.html
  popup.js
  popup.css
  styles.css
  icons/icon16.png
  icons/icon32.png
  icons/icon48.png
  icons/icon128.png
  LICENSE
)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || { echo "MISSING: $f" >&2; exit 1; }
done

mkdir -p dist
rm -f "$OUT"
zip -q -X "$OUT" "${FILES[@]}"

echo "built  $OUT"
echo "size   $(du -h "$OUT" | cut -f1 | tr -d ' ')"
echo
echo "contents:"
# `unzip -Z1` lists paths only - portable across GNU and BSD unzip, unlike
# trying to trim the header and footer off `unzip -l`.
unzip -Z1 "$OUT" | sed 's/^/  /'
echo

# manifest.json must be at the root, not nested under a folder.
if ! unzip -Z1 "$OUT" | grep -qx 'manifest.json'; then
  echo "ERROR: manifest.json is not at the zip root - both stores reject this." >&2
  exit 1
fi
echo "manifest.json is at the zip root."
echo
echo "Next: npx web-ext lint --source-dir .   (expect 0 errors, 2 known warnings)"
