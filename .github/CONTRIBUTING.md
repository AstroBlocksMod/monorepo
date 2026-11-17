# Contributing

AstroBlocks is a pnpm workspace holding the Scratch editor and its
supporting libraries under `packages/`, plus the docs site under `docs/`.
Changes to any of them land in this repository.

## Setup

You need [Node.js](https://nodejs.org/) v24 (see [`.nvmrc`](../.nvmrc)),
[pnpm](https://pnpm.io/), and Python 3, which `scratch-blocks` uses to run
`build.py` and compile its Blockly messages.

```sh
pnpm install
pnpm start      # runs the editor at http://localhost:8601
```

`pnpm start` builds `scratch-gui` from source, and `scratch-gui` resolves
`scratch-vm`, `scratch-render`, and `scratch-paint` from their `src/`
directories, so edits to those show up on reload. `scratch-blocks` and
`scratch-storage` are consumed from their build output instead, so rebuild them
after changing either:

```sh
pnpm --filter scratch-blocks run build
```

## Workspace commands

| Command | What it does |
| --- | --- |
| `pnpm build` | Build every package in dependency order |
| `pnpm test` | Run every package's test suite |
| `pnpm lint` | Lint every package |
| `pnpm --filter <pkg> run <script>` | Run one package's script |

To build a single package along with its workspace dependencies, use
`pnpm --filter "<pkg>..." run build`.

## Submitting changes

1. Branch from `main`.
2. Make your change, and add tests where the package has a suite to add them to.
3. Run `pnpm lint` and `pnpm test` for the packages you touched. CI runs the
   same scripts per package, listed in [`workflows/ci.yml`](workflows/ci.yml).
4. If the change is something users see, update the docs site to match.
5. Open a pull request against `main` and fill in the template.

Pushes to `main` deploy the editor to GitHub Pages automatically via
[`workflows/deploy.yml`](workflows/deploy.yml), with the docs site under `/docs/`.

## Docs

The docs site is built with [Rspress](https://rspress.rs/) from `docs/`. Pages
are `.mdx` files under `docs/docs/`, and each section's sidebar order comes from
its `_meta.json`.

```sh
pnpm --filter astroblocks-docs run dev     # live preview
pnpm --filter astroblocks-docs run build   # what CI and deploy run
pnpm --filter astroblocks-docs run format  # Prettier, which CI checks
```

## A note on the toolchain

These packages build with [Rspack](https://rspack.rs) (`rspack.config.js` in each
package), but the surrounding dependency set is still largely legacy, and
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) documents several overrides and
hoisting rules that exist to keep that working. Please read those comments
before changing dependency versions or resolution settings.
