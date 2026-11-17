// The one Prettier config for the whole workspace. Prettier uses the nearest config
// file, so packages must not keep their own: packages/extensions shipped a
// .prettierrc.json upstream and it was deleted on purpose so this file applies there too.
//
// The options are the ones TurboWarp/extensions uses, so upstream extension code
// formats the same here as it does upstream. If an upstream sync reports that the
// deleted .prettierrc.json changed, copy the change into this file.
//
// @prettier/plugin-oxc swaps the JavaScript and TypeScript parsers for oxc, which is
// faster than the default Babel parser and produces the same output.

/** @type {import("prettier").Config} */
export default {
  plugins: ["@prettier/plugin-oxc"],
  trailingComma: "es5",
  endOfLine: "auto",
};
