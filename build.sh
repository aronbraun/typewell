#!/usr/bin/env bash
#
# Build step for Cloudflare Pages (and anything else that wants a publishable
# directory). Copies the site into dist/ and substitutes the Google OAuth
# client ID from the GOOGLE_CLIENT_ID environment variable.
#
# There is no bundler and nothing is compiled — this exists only so the client
# ID lives in deploy configuration rather than in the committed source, and so
# that the published directory contains the site and nothing else.
#
#   Cloudflare Pages → Build command: bash build.sh
#                      Build output directory: dist
#                      Environment variable: GOOGLE_CLIENT_ID
#
# Run it locally the same way: GOOGLE_CLIENT_ID=... bash build.sh
#
set -euo pipefail

OUT=dist
PAGES=(index.html privacy.html terms.html)

rm -rf "$OUT"
mkdir -p "$OUT"
cp "${PAGES[@]}" "$OUT/"

# Unset is not an error: the app falls back to an empty client ID and the Drive
# panel reads "not configured", which is exactly what a preview build wants.
: "${GOOGLE_CLIENT_ID:=}"
if [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo "build.sh: warning: GOOGLE_CLIENT_ID is not set — Drive backup will show 'not configured'" >&2
fi

# The value is read from the environment, never interpolated into the script
# text. '|' is a safe delimiter: OAuth client IDs are [A-Za-z0-9-_.] only.
sed -i "s|__GOOGLE_CLIENT_ID__|${GOOGLE_CLIENT_ID}|g" "$OUT/index.html"

if grep -q '__GOOGLE_CLIENT_ID__' "$OUT/index.html"; then
  echo "build.sh: warning: placeholder still present after substitution" >&2
fi

echo "build.sh: wrote $OUT/ (${#PAGES[@]} pages)"
