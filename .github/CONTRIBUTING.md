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
   same scripts per package — see [`workflows/ci.yml`](workflows/ci.yml).
4. Open a pull request against `main` and fill in the template.

Pushes to `main` deploy the editor to GitHub Pages automatically via
[`workflows/deploy.yml`](workflows/deploy.yml).

## A note on the toolchain

These packages are pinned to a webpack 4-era dependency set, and
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) documents several overrides and
hoisting rules that exist to keep that working. Please read those comments
before changing dependency versions or resolution settings.
