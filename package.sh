#!/usr/bin/env bash
#
# Builds the store submission zips - one per browser - and validates them.
#
# Why two: Firefox has no background service worker support and needs
# background.scripts, while Chrome warns that "'background.scripts' requires
# manifest version of 2 or lower". A single manifest carrying both keys works in
# both browsers but warns in both, on every unpacked load and in the AMO linter.
# The two stores are separate uploads anyway, so each gets a manifest with only
# the keys it understands.
#
# manifest.json is the Chrome manifest, so loading this directory unpacked in
# Chrome is warning-free. manifest.firefox.json holds the Firefox differences and
# is merged over it here; a null value there removes the key.
#
# Usage:
#   ./package.sh              build and validate both
#   ./package.sh --no-lint    build only
#
# dist/pkg-firefox is a ready-to-run directory:
#   npx web-ext run --source-dir dist/pkg-firefox

set -euo pipefail
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")

# Everything the extension ships, and nothing else.
FILES=(
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

for f in "${FILES[@]}" manifest.json manifest.firefox.json; do
  [[ -f "$f" ]] || { echo "MISSING: $f" >&2; exit 1; }
done

rm -rf dist
mkdir -p dist

stage() {
  local target="$1" stage_dir="dist/pkg-$1"
  mkdir -p "$stage_dir"
  for f in "${FILES[@]}"; do
    mkdir -p "$stage_dir/$(dirname "$f")"
    cp "$f" "$stage_dir/$f"
  done

  if [[ "$target" == "chrome" ]]; then
    cp manifest.json "$stage_dir/manifest.json"
  else
    python3 - "$stage_dir/manifest.json" <<'PY'
import json, sys, collections

base  = json.load(open("manifest.json"), object_pairs_hook=collections.OrderedDict)
patch = json.load(open("manifest.firefox.json"), object_pairs_hook=collections.OrderedDict)
patch.pop("__comment", None)

for key, value in patch.items():
    if value is None:
        base.pop(key, None)          # key not understood by this browser
    elif isinstance(value, dict) and isinstance(base.get(key), dict):
        merged = collections.OrderedDict(base[key])
        merged.update(value)
        # Firefox must not carry Chrome's service_worker, or its linter objects.
        if key == "background":
            merged.pop("service_worker", None)
        base[key] = merged
    else:
        base[key] = value

json.dump(base, open(sys.argv[1], "w"), indent=2)
open(sys.argv[1], "a").write("\n")
PY
  fi
}

build() {
  local target="$1" stage_dir="dist/pkg-$1"
  local out="dist/gridlens-for-bootstrap-v${VERSION}-${target}.zip"

  stage "$target"
  ( cd "$stage_dir" && zip -q -r -X "../../$out" . -x '.*' )

  # Captured first rather than piped into `grep -q`: grep exits on the first
  # match, unzip then dies of SIGPIPE, and `set -o pipefail` reports the
  # pipeline as failed even though the check passed.
  local entries
  entries=$(unzip -Z1 "$out")
  if ! grep -qx 'manifest.json' <<<"$entries"; then
    echo "ERROR: manifest.json is not at the zip root of $out" >&2
    exit 1
  fi

  echo "built  $out  ($(du -h "$out" | cut -f1 | tr -d ' '))"
}

build chrome
build firefox

echo
echo "manifest differences:"
python3 - <<'PY'
import json
c = json.load(open("dist/pkg-chrome/manifest.json"))
f = json.load(open("dist/pkg-firefox/manifest.json"))
for key in sorted(set(c) | set(f)):
    if c.get(key) != f.get(key):
        print(f"  {key}")
        print(f"     chrome : {json.dumps(c.get(key))}")
        print(f"     firefox: {json.dumps(f.get(key))}")
PY

if [[ "${1:-}" == "--no-lint" ]]; then
  exit 0
fi

echo
echo "linting the Firefox payload (this is what AMO receives)…"
echo
# Expect: 0 errors, 0 notices, 1 warning - the single deliberate innerHTML that
# mirrors Bootstrap's own data-bs-html behaviour, explained in STORE-LISTING.md.
# A second warning means something new was introduced; investigate before upload.
npx --yes web-ext@8.9.0 lint --source-dir dist/pkg-firefox 2>&1 \
  | grep -v "EBADENGINE\|npm WARN" \
  | grep -A5 "Validation Summary" || true
