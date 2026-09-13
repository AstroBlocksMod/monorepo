const staticFetch = require('./tw-static-fetch');

/**
 * Parse a URL object or return null.
 * @param {string} url The URL to parse.
 * @returns {URL|null} The parsed URL, or null if it could not be parsed.
 */
const parseURL = url => {
    try {
        return new URL(url, location.href);
    } catch (e) {
        return null;
    }
};

/**
 * The same permission checks that `Scratch.fetch`, `Scratch.openWindow` and friends apply to
 * extensions, made available to the block packages that were merged in from extensions.
 *
 * Each function takes the runtime so that it can reach `runtime.vm.securityManager`. The VM
 * back-reference is set after block packages are constructed, so these must only be called
 * while a block is actually running.
 */

/**
 * @param {!Runtime} runtime The runtime running the block.
 * @returns {?SecurityManager} The security manager, or null if there is no VM attached.
 */
const getSecurityManager = runtime => (runtime && runtime.vm ? runtime.vm.securityManager : null);

/**
 * Fetch a URL, subject to the project's fetch permissions.
 * @param {!Runtime} runtime The runtime running the block.
 * @param {string} url The URL to fetch.
 * @param {object} [options] Options to pass to `fetch`.
 * @returns {Promise<Response>} Resolves with the response, or rejects if permission was denied.
 */
const guardedFetch = async (runtime, url, options) => {
    const staticFetchResult = staticFetch(url);
    if (staticFetchResult) {
        return staticFetchResult;
    }
    const parsed = parseURL(url);
    if (!parsed) {
        throw new Error(`Invalid URL: ${url}`);
    }
    // Protocols that don't involve a remote request are always allowed.
    if (parsed.protocol !== 'blob:' && parsed.protocol !== 'data:') {
        const securityManager = getSecurityManager(runtime);
        if (!securityManager || !await securityManager.canFetch(parsed.href)) {
            throw new Error(`Permission to fetch ${parsed.href} rejected.`);
        }
    }
    return fetch(url, options);
};

/**
 * Open a URL in a new tab, subject to the project's permissions.
 * @param {!Runtime} runtime The runtime running the block.
 * @param {string} url The URL to open.
 * @returns {Promise<void>} Resolves once the tab has been opened, or permission was denied.
 */
const guardedOpenWindow = async (runtime, url) => {
    const parsed = parseURL(url);
    // eslint-disable-next-line no-script-url
    if (!parsed || parsed.protocol === 'javascript:') {
        return;
    }
    const securityManager = getSecurityManager(runtime);
    if (!securityManager || !await securityManager.canOpenWindow(parsed.href)) {
        return;
    }
    // Use noreferrer to prevent the new tab from accessing `window.opener`.
    window.open(url, '_blank', 'noreferrer');
};

/**
 * Redirect the page to a URL, subject to the project's permissions.
 * @param {!Runtime} runtime The runtime running the block.
 * @param {string} url The URL to redirect to.
 * @returns {Promise<void>} Resolves once the redirect has started, or permission was denied.
 */
const guardedRedirect = async (runtime, url) => {
    const parsed = parseURL(url);
    // eslint-disable-next-line no-script-url
    if (!parsed || parsed.protocol === 'javascript:') {
        return;
    }
    const securityManager = getSecurityManager(runtime);
    if (!securityManager || !await securityManager.canRedirect(parsed.href)) {
        return;
    }
    location.href = url;
};

/**
 * Read the system clipboard, subject to the project's permissions.
 * @param {!Runtime} runtime The runtime running the block.
 * @returns {Promise<string>} Resolves with the clipboard text, or '' if it could not be read.
 */
const guardedReadClipboard = async runtime => {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        return '';
    }
    const securityManager = getSecurityManager(runtime);
    if (!securityManager || !await securityManager.canReadClipboard()) {
        return '';
    }
    try {
        return await navigator.clipboard.readText();
    } catch (e) {
        return '';
    }
};

module.exports = {
    guardedFetch,
    guardedOpenWindow,
    guardedRedirect,
    guardedReadClipboard
};
