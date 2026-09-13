/* eslint-disable import/no-unresolved */
// The raw SVG is stored in the builtin asset store so the costume resolves offline,
// while the url-loader copy is only used for the sprite library thumbnail.
import shoppySVG from '!raw-loader!./default-project/shoppy-bag.svg';
import shoppyURL from './default-project/shoppy-bag.svg';
/* eslint-enable import/no-unresolved */

// md5 of shoppy-bag.svg. Keep in sync if the file is ever edited.
const SHOPPY_ASSET_ID = '36d05424bb2d1b4aa7314622d188b486';

/**
 * The Shoppy Bag costume, in the shape Scratch uses inside project.json.
 * @param {string} name costume name, so callers can localize it
 * @return {object} a costume descriptor
 */
const shoppyCostume = name => ({
    assetId: SHOPPY_ASSET_ID,
    name,
    bitmapResolution: 1,
    md5ext: `${SHOPPY_ASSET_ID}.svg`,
    dataFormat: 'svg',
    // The rotation center the art was drawn around, scaled along with it.
    rotationCenterX: 40.27823,
    rotationCenterY: 44.45689
});

/**
 * Asset descriptor for the builtin storage helper, matching the default project's format.
 * @return {object} an asset descriptor
 */
const shoppyAsset = () => ({
    id: SHOPPY_ASSET_ID,
    assetType: 'ImageVector',
    dataFormat: 'SVG',
    data: shoppySVG
});

export {
    SHOPPY_ASSET_ID,
    shoppyCostume,
    shoppyAsset,
    shoppyURL
};
