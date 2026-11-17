import * as path from "node:path";
import { defineConfig } from "@rspress/core";

export default defineConfig({
  root: path.join(__dirname, "docs"),
  // The docs are published next to the editor on the same GitHub Pages site, under
  // /docs/ (see .github/workflows/deploy.yml). Keep the two in step.
  base: "/docs/",
  outDir: "build",
  lang: "en",
  title: "AstroBlocks",
  description:
    "Documentation for AstroBlocks, a Scratch editor built on TurboWarp.",
  icon: "/favicon.ico",
  logo: "/rubble.png",
  logoText: "AstroBlocks",
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/AstroBlocksMod/monorepo",
      },
    ],
    editLink: {
      docRepoBaseUrl:
        "https://github.com/AstroBlocksMod/monorepo/tree/main/docs/docs",
    },
  },
});
