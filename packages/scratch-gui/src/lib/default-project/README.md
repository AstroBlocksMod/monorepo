`rocket.svg` is the AstroBlocks logo, scaled to 44% so it is a sensible sprite size.
It is the default project's costume and is also in the sprite library as "AstroBlocks Rocket".
Because it is not on the Scratch asset host, it is cached in the builtin store by `src/lib/storage.js`.
Regenerate its `assetId` (the md5 of the file) in `src/lib/rocket-costume.js` if the art changes.

`dango-cat.svg` was created by https://scratch.mit.edu/users/littlebunny06/ 🍡🐱
(no longer the default costume, but still in the Scratch sprite library)

If `default-project.sb3` is replaced with a non-empty file, it will be used instead of the costumes.
