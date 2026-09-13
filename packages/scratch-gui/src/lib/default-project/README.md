`shoppy-bag.svg` is the AstroBlocks logo, scaled to 52% so it is a sensible sprite size.
It is the default project's costume and is also in the sprite library as "Shoppy Bag".
Because it is not on the Scratch asset host, it is cached in the builtin store by `src/lib/storage.js`.
Regenerate its `assetId` (the md5 of the file) in `src/lib/shoppy-costume.js` if the art changes,
and keep the copy of the costume's metadata in `src/lib/libraries/sprites.json` in sync.

`dango-cat.svg` was created by https://scratch.mit.edu/users/littlebunny06/ 🍡🐱
(no longer the default costume, but still in the Scratch sprite library)

If `default-project.sb3` is replaced with a non-empty file, it will be used instead of the costumes.
