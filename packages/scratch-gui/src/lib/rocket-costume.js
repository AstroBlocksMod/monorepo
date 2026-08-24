/* eslint-disable import/no-unresolved */
// The raw SVG is stored in the builtin asset store so the costume resolves offline,
// while the url-loader copy is only used for the sprite library thumbnail.
import rocketSVG from '!raw-loader!./default-project/rocket.svg';
import rocketURL from './default-project/rocket.svg';
/* eslint-enable import/no-unresolved */

// md5 of rocket.svg. Keep in sync if the file is ever edited.
const ROCKET_ASSET_ID = '2bb92959b1b8c6d45a7585ee3240a354';

/**
 * The rocket costume, in the shape Scratch uses inside project.json.
 * @param {string} name costume name, so callers can localize it
 * @return {object} a costume descriptor
 */
const rocketCostume = name => ({
    assetId: ROCKET_ASSET_ID,
    name,
    bitmapResolution: 1,
    md5ext: `${ROCKET_ASSET_ID}.svg`,
    dataFormat: 'svg',
    // The costume is 110.00112 x 110.45775, so these are its center.
    rotationCenterX: 55.00056,
    rotationCenterY: 55.228875
});

/**
 * Asset descriptor for the builtin storage helper, matching the default project's format.
 * @return {object} an asset descriptor
 */
const rocketAsset = () => ({
    id: ROCKET_ASSET_ID,
    assetType: 'ImageVector',
    dataFormat: 'SVG',
    data: rocketSVG
});

export {
    ROCKET_ASSET_ID,
    rocketCostume,
    rocketAsset,
    rocketURL
};
