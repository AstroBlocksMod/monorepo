/**
 * @fileoverview
 * Keeps an extension's palette in step with the project.
 *
 * Some palettes list things that live in the project, such as the custom blocks of every sprite. They
 * have to be rebuilt when those change, but rebuilding a palette is slow and the project changes on
 * every edit. This waits a moment after a change, works out a signature of what the palette would
 * show, and only asks for a rebuild when the signature is different from last time.
 */

/** How long to wait after a change to the project before looking at the palette, in milliseconds. */
const REFRESH_DELAY = 250;

class PaletteRefresher {
    /**
     * @param {import('../engine/runtime')} runtime The runtime.
     * @param {string} extensionId ID of the extension whose palette this looks after.
     * @param {function(): string} getSignature Returns a string that changes when the palette should.
     */
    constructor (runtime, extensionId, getSignature) {
        this.runtime = runtime;
        this.extensionId = extensionId;
        this.getSignature = getSignature;
        this._shownSignature = null;
        this._timeout = null;

        const schedule = () => this.schedule();
        runtime.on('PROJECT_CHANGED', schedule);
        runtime.on('PROJECT_LOADED', schedule);
        runtime.on('TARGETS_UPDATE', schedule);
    }

    /**
     * Note what the palette shows now. Call this from the extension's getInfo().
     * @param {string} signature The signature of the palette being built.
     */
    shown (signature) {
        this._shownSignature = signature;
    }

    /**
     * Look at the palette soon, and rebuild it if it is stale.
     */
    schedule () {
        if (this._timeout !== null) return;
        this._timeout = setTimeout(() => {
            this._timeout = null;
            // Not there when the runtime is used without a VM around it.
            const extensionManager = this.runtime.extensionManager;
            if (!extensionManager || !extensionManager.isExtensionLoaded(this.extensionId)) return;
            if (this.getSignature() !== this._shownSignature) {
                extensionManager.refreshBlocks(this.extensionId);
            }
        }, REFRESH_DELAY);
        // Do not keep Node alive for this when a project runs without the editor.
        if (this._timeout && this._timeout.unref) {
            this._timeout.unref();
        }
    }
}

module.exports = PaletteRefresher;
