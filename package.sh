#!/usr/bin/env bash
#
# Builds the store submission zip, and validates exactly what gets uploaded.
#
# Files are staged into dist/pkg/ first and the zip is built from inside it, so
# manifest.json is structurally guaranteed to sit at the zip root - both stores
# reject a zip of the containing folder. Staging also means the linter can run
# against the real payload rather than the working tree, which carries dev-only
# files (package.sh, docs/, demo/) that AMO flags as unnecessary.
#
# Usage:
#   ./package.sh            build and validate
#   ./package.sh --no-lint  build only

set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
STAGE="dist/pkg"
OUT="dist/gridlens-for-bootstrap-v${VERSION}.zip"

# Everything the extension ships, and nothing else.
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

rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE"
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
done

( cd "$STAGE" && zip -q -r -X "../../$OUT" . -x '.*' )

echo "built  $OUT"
echo "size   $(du -h "$OUT" | cut -f1 | tr -d ' ')"
echo
echo "contents:"
unzip -Z1 "$OUT" | sed 's/^/  /'
echo

if ! unzip -Z1 "$OUT" | grep -qx 'manifest.json'; then
  echo "ERROR: manifest.json is not at the zip root - both stores reject this." >&2
  exit 1
fi
echo "manifest.json is at the zip root."

if [[ "${1:-}" == "--no-lint" ]]; then
  exit 0
fi

echo
echo "linting the staged payload (this is what gets uploaded)…"
echo
# Expect: 0 errors, 0 notices, 2 warnings. Both warnings are intentional and
# explained in STORE-LISTING.md under "Notes to reviewer" - the service_worker
# key Firefox ignores by design, and the one deliberate innerHTML that mirrors
# Bootstrap's own data-bs-html behaviour. A third warning means something new
# was introduced; investigate before uploading.
npx --yes web-ext@8.9.0 lint --source-dir "$STAGE" 2>&1 \
  | grep -v "EBADENGINE\|npm WARN" \
  | grep -A5 "Validation Summary" || true
