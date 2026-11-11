#!/usr/bin/env bash
# Fetch a package's TurboWarp upstream into refs/upstream/<package>.
#
# .github/upstream/<package> records the upstream repository and branch, and the
# upstream commit the package was last synced to. merge-upstream.sh then merges
# the upstream changes made since that commit.
#
# Usage: .github/scripts/fetch-upstream.sh <package>
#
# Progress goes to stderr. stdout gets key=value lines (for $GITHUB_OUTPUT):
#   repo    upstream GitHub repository, e.g. TurboWarp/scratch-gui
#   branch  upstream branch
#   base    upstream commit the package was last synced to
#   tip     current upstream tip, now at refs/upstream/<package>
#   count   number of upstream commits after base, up to tip

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <package>" >&2
  exit 2
fi
pkg=$1

state="$(git rev-parse --show-toplevel)/.github/upstream/$pkg"
if [ ! -f "$state" ]; then
  echo "error: no upstream recorded for '$pkg' (expected $state)" >&2
  exit 2
fi
field() { sed -n "s/^$1=//p" "$state"; }
repo=$(field repo) branch=$(field branch) base=$(field commit)

echo "Fetching $repo ($branch)..." >&2
git fetch --quiet --no-tags "https://github.com/$repo.git" "+refs/heads/$branch:refs/upstream/$pkg"
tip=$(git rev-parse "refs/upstream/$pkg")

if ! git merge-base --is-ancestor "$base" "$tip" 2>/dev/null; then
  cat >&2 <<EOF
error: $repo $branch no longer contains $base, the commit
packages/$pkg was last synced to. Upstream rewrote its history; set "commit" in
.github/upstream/$pkg by hand to the upstream commit the package now matches.
EOF
  exit 1
fi

echo "repo=$repo"
echo "branch=$branch"
echo "base=$base"
echo "tip=$tip"
echo "count=$(git rev-list --count "$base..$tip")"
