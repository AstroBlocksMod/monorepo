import {SHOPPY_ASSET_ID, shoppyURL} from '../shoppy-costume';

// The bag is bundled with the app instead of living on the asset host, so the library
// needs a local URL for its thumbnail. Everything else about it is in sprites.json.
const attachShoppyThumbnail = sprites => sprites.map(sprite => (
    sprite.costumes && sprite.costumes[0].assetId === SHOPPY_ASSET_ID ?
        {...sprite, rawURL: shoppyURL} :
        sprite
));

const asyncLibrary = callback => {
    let data = null;
    return () => {
        if (data) return data;
        return callback()
            .then(mod => (data = mod.default));
    };
};

export const getBackdropLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-backdrops" */ './backdrops.json')
);
export const getCostumeLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-costumes" */ './costumes.json')
);
export const getSoundLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sounds" */ './sounds.json')
);
export const getSpriteLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sprites" */ './sprites.json')
        .then(mod => ({default: attachShoppyThumbnail(mod.default)}))
);
