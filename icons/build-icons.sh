#!/usr/bin/env bash
#
# Renders icons/icon.svg to the four PNG sizes the manifest ships.
#
# Uses headless Chrome because it is the one SVG renderer guaranteed to be
# present on a machine that develops browser extensions, and it rasterises the
# same way the browser will. Re-run after editing icon.svg.
#
# Usage: ./icons/build-icons.sh

set -euo pipefail
cd "$(dirname "$0")"

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[[ -x "$CHROME" ]] || { echo "Chrome not found at: $CHROME (override with \$CHROME)" >&2; exit 1; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
cp icon.svg "$WORK/"

for size in 16 32 48 128; do
  cat > "$WORK/render.html" <<EOF
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
html,body { margin:0; padding:0; background:transparent; }
img { display:block; width:${size}px; height:${size}px; }
</style></head><body><img src="icon.svg"></body></html>
EOF

  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=1 \
    --default-background-color=00000000 \
    --window-size="$size,$size" \
    --screenshot="$WORK/out.png" \
    "file://$WORK/render.html" >/dev/null 2>&1

  [[ -f "$WORK/out.png" ]] || { echo "render failed at ${size}px" >&2; exit 1; }
  mv "$WORK/out.png" "icon${size}.png"
  echo "  icon${size}.png"
done

echo
echo "Rendered 4 sizes from icon.svg."
