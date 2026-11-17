# Contributing

AstroBlocks is a pnpm workspace holding the Scratch editor and its
supporting libraries under `packages/`. Changes to any of them land in this
repository.

## Setup

You need [Node.js](https://nodejs.org/) v24 (see [`.nvmrc`](../.nvmrc)),
[pnpm](https://pnpm.io/), and Python 3 — `scratch-blocks` shells out to
`build.py` to compile its Blockly messages.

```sh
pnpm install
pnpm start      # runs the editor at http://localhost:8601
```

`pnpm start` builds `scratch-gui` from source, and `scratch-gui` resolves
`scratch-vm`, `scratch-render`, and `scratch-paint` from their `src/`
directories, so edits to those show up on reload. `scratch-blocks` and
`scratch-storage` are consumed from their build output instead — rebuild them
after changing either:

```sh
pnpm --filter scratch-blocks run build
```

## Workspace commands

| Command                            | What it does                                                        |
| ---------------------------------- | ------------------------------------------------------------------- |
| `pnpm build`                       | Build every package in dependency order                             |
| `pnpm test`                        | Run every package's test suite                                      |
| `pnpm lint`                        | Lint every package                                                  |
| `pnpm format`                      | Format the repo's own files and `packages/extensions` with Prettier |
| `pnpm check-format`                | Check that formatting without changing anything                     |
| `pnpm --filter <pkg> run <script>` | Run one package's script                                            |

To build a single package along with its workspace dependencies, use
`pnpm --filter "<pkg>..." run build`.

Prettier is set up once, in [`prettier.config.mjs`](../prettier.config.mjs) at the
root, with [`@prettier/plugin-oxc`](https://www.npmjs.com/package/@prettier/plugin-oxc)
for faster JavaScript parsing. It covers the root files, `.github/` and
`packages/extensions`. The other packages are styled by their own ESLint configs,
as upstream does, and are left out so that upstream syncs keep merging cleanly.

## Submitting changes

1. Branch from `main`.
2. Make your change, and add tests where the package has a suite to add them to.
3. Run `pnpm lint` and `pnpm test` for the packages you touched, and
   `pnpm check-format`. CI runs the same scripts (see
   [`workflows/ci.yml`](workflows/ci.yml)).
4. Open a pull request against `main` and fill in the template.

Pushes to `main` deploy the editor to GitHub Pages automatically via
[`workflows/deploy.yml`](workflows/deploy.yml).

## A note on the toolchain

These packages build with [Rspack](https://rspack.rs) (`rspack.config.js` in each
package), but the surrounding dependency set is still largely legacy, and
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) documents several overrides and
hoisting rules that exist to keep that working. Please read those comments
before changing dependency versions or resolution settings.
