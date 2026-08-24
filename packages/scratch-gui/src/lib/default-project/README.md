`rubble.png` is Rubble, the AstroBlocks mascot and logo: the 32x32 pixel art from the repo's
`logo.png`, scaled 6x with nearest-neighbor to 192x192. It is a bitmap costume with
bitmapResolution 2, so it is 96x96 on stage and stays sharp on high-DPI screens.
It is the default project's costume and is also in the sprite library as "Rubble".
Because it is not on the Scratch asset host, it is cached in the builtin store by `src/lib/storage.js`.
Regenerate its `assetId` (the md5 of the file) in `src/lib/rubble-costume.js` and
`src/lib/libraries/sprites.json` if the art changes.

`dango-cat.svg` was created by https://scratch.mit.edu/users/littlebunny06/ 🍡🐱
(no longer the default costume, but still in the Scratch sprite library)

If `default-project.sb3` is replaced with a non-empty file, it will be used instead of the costumes.
