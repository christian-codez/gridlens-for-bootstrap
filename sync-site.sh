#!/usr/bin/env bash
#
# Copies the published pages into the CHADA site.
#
# docs/ is the source of truth and is also what GitHub Pages serves. chada.ca is
# the canonical home - every page carries a rel="canonical" pointing there, so
# the GitHub copy stays a mirror rather than competing with it.
#
# The pages link each other relatively, so they work unchanged at any base path.
# WordPress's .htaccess only rewrites requests that do not match a real file or
# directory, so a real /gridlens/ directory is served straight by Apache and
# WordPress never sees it - no page, plugin or theme change needed.
#
# Usage: ./sync-site.sh [path-to-webroot]

set -euo pipefail
cd "$(dirname "$0")"

WEBROOT="${1:-/Users/christian/Server/chada/app/public}"
DEST="$WEBROOT/gridlens"

[[ -d "$WEBROOT" ]] || { echo "Webroot not found: $WEBROOT" >&2; exit 1; }
[[ -f "$WEBROOT/wp-config.php" ]] || echo "note: $WEBROOT does not look like a WordPress root" >&2

mkdir -p "$DEST"
# --delete keeps the mirror exact; scoped to $DEST so nothing else is touched.
rsync -a --delete --exclude '.DS_Store' docs/ "$DEST/"

echo "synced -> $DEST"
find "$DEST" -type f | sed "s|$DEST|  /gridlens|"
echo
echo "Local:  http://chada.local/gridlens/"
echo "Live:   https://chada.ca/gridlens/   (after your next push)"
