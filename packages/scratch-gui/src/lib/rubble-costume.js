/* eslint-disable import/no-unresolved */
// The PNG bytes are stored in the builtin asset store so the costume resolves offline,
// while the url-loader copy is only used for the sprite library thumbnail.
import rubblePNG from '!arraybuffer-loader!./default-project/rubble.png';
import rubbleURL from './default-project/rubble.png';
/* eslint-enable import/no-unresolved */

// md5 of rubble.png. Keep in sync if the file is ever edited.
const RUBBLE_ASSET_ID = 'baf2cfcf706fca52c385f1fba2231fef';

/**
 * The Rubble costume, in the shape Scratch uses inside project.json.
 * It is pixel art, so it is a bitmap: 192 x 192 pixels at bitmapResolution 2 (96 x 96 on stage).
 * @param {string} name costume name, so callers can localize it
 * @return {object} a costume descriptor
 */
const rubbleCostume = name => ({
    assetId: RUBBLE_ASSET_ID,
    name,
    bitmapResolution: 2,
    md5ext: `${RUBBLE_ASSET_ID}.png`,
    dataFormat: 'png',
    // Bitmap rotation centers are in image pixels, so this is the center of the 192 x 192 image.
    rotationCenterX: 96,
    rotationCenterY: 96
});

/**
 * Asset descriptor for the builtin storage helper, matching the default project's format.
 * @return {object} an asset descriptor
 */
const rubbleAsset = () => ({
    id: RUBBLE_ASSET_ID,
    assetType: 'ImageBitmap',
    dataFormat: 'PNG',
    data: new Uint8Array(rubblePNG)
});

export {
    RUBBLE_ASSET_ID,
    rubbleCostume,
    rubbleAsset,
    rubbleURL
};
