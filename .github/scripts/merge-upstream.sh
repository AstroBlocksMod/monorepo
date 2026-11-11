#!/usr/bin/env bash
# Merge the upstream changes fetched by fetch-upstream.sh into packages/<package>,
# as one commit on the current branch that also records the new upstream commit
# in .github/upstream/<package>.
#
# This is a three-way merge of the package directory: the base is the upstream
# commit last synced to, "ours" is the current branch, and "theirs" is the new
# upstream tip. The result is a single ordinary commit with no upstream history
# attached, so a PR containing it can be merged any way, squash included.
#
# Usage: .github/scripts/merge-upstream.sh <package>
#
# Conflicts are handled like this:
# - Files deleted in this repo on purpose (upstream lockfiles, upstream CI, .nvmrc,
#   ...) that upstream has since modified stay deleted.
# - Every other conflict is committed with its conflict markers in place. CI fails
#   on them, so the PR cannot be merged until someone resolves them.
#
# stdout: conflicts=<number of files committed with conflict markers>
# $NOTES_FILE, if set, receives Markdown notes for the PR description.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <package>" >&2
  exit 2
fi
pkg=$1
notes=${NOTES_FILE:-/dev/null}

state_path=.github/upstream/$pkg
state="$(git rev-parse --show-toplevel)/$state_path"
field() { sed -n "s/^$1=//p" "$state"; }
repo=$(field repo) branch=$(field branch) base=$(field commit)
tip=$(git rev-parse "refs/upstream/$pkg")
count=$(git rev-list --count "$base..$tip")

# An upstream commit's tree, placed at packages/<pkg>/ in an otherwise empty tree:
# the package as seen from this repo's root.
wrap() {
  local inner
  inner=$(printf '040000 tree %s\t%s\n' "$(git rev-parse "$1^{tree}")" "$pkg" | git mktree)
  printf '040000 tree %s\tpackages\n' "$inner" | git mktree
}
base_commit=$(git commit-tree -m "$repo@$base" "$(wrap "$base")")
tip_commit=$(git commit-tree -p "$base_commit" -m "$repo@$tip" "$(wrap "$tip")")

# Cherry-picking tip_commit merges with its parent as the merge base, which
# applies exactly the upstream changes from base to tip.
kept_deleted=()
conflicted=()
if ! git cherry-pick --no-commit "$tip_commit" >&2; then
  if [ -z "$(git ls-files --unmerged)" ]; then
    echo "error: git cherry-pick failed without leaving conflicts to resolve" >&2
    exit 1
  fi
  while IFS= read -r -d '' entry; do
    status=${entry:0:2} path=${entry:3}
    case "$status" in
      DU) # Deleted here, modified upstream: keep it deleted.
        git rm --quiet -- "$path"
        kept_deleted+=("$path") ;;
      DD) # Deleted on both sides (a rename conflict): nothing to keep.
        git rm --quiet -- "$path" ;;
      AU | UD | UA | AA | UU)
        git add -- "$path"
        conflicted+=("$path") ;;
    esac
  done < <(git status --porcelain=v1 -z --no-renames)
fi

{
  sed '/^commit=/d' "$state"
  echo "commit=$tip"
} >"$state.tmp"
mv "$state.tmp" "$state"
git add -- "$state_path"

{
  echo "chore: sync $pkg with $repo@${tip:0:12}"
  echo
  echo "Merges $count upstream commits from $repo $branch into packages/$pkg:"
  echo "https://github.com/$repo/compare/$base...$tip"
  if [ ${#conflicted[@]} -gt 0 ]; then
    printf '\nCommitted with conflict markers:\n'
    printf '  %s\n' "${conflicted[@]}"
  fi
  if [ ${#kept_deleted[@]} -gt 0 ]; then
    printf '\nModified upstream but deleted here, so kept deleted:\n'
    printf '  %s\n' "${kept_deleted[@]}"
  fi
} | git commit --quiet --no-verify --file=-
# Clear the cherry-pick state that a conflict leaves behind; the commit is done.
git cherry-pick --quit 2>/dev/null || true

# Git's rename detection can carry upstream changes to files that were moved out
# of the package (packages/scratch-gui/.nvmrc became /.nvmrc, for example).
mapfile -t outside < <(git diff --name-only HEAD^ HEAD -- . \
  ":(exclude)packages/$pkg/" ":(exclude)$state_path")

# The backticks below are Markdown, not command substitution.
# shellcheck disable=SC2016
{
  if [ ${#conflicted[@]} -gt 0 ]; then
    echo
    echo "### Conflicts"
    echo
    echo "> [!WARNING]"
    echo "> These files were committed **with conflict markers** and must be resolved before merging:"
    echo
    printf -- '- `%s`\n' "${conflicted[@]}"
  fi
  if [ ${#kept_deleted[@]} -gt 0 ]; then
    echo
    echo "### Kept deleted"
    echo
    echo "Upstream modified these files, which were deleted in this repo. They stay deleted:"
    echo
    printf -- '- `%s`\n' "${kept_deleted[@]}"
  fi
  if [ ${#outside[@]} -gt 0 ]; then
    echo
    echo "### Changes outside \`packages/$pkg\`"
    echo
    echo "Git followed a rename and applied upstream changes to these files. Check that they belong:"
    echo
    printf -- '- `%s`\n' "${outside[@]}"
  fi
} >>"$notes"

echo "conflicts=${#conflicted[@]}"
