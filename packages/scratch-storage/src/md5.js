/**
 * @fileoverview
 * Pure JavaScript MD5 optimized for hashing large binary assets.
 *
 * - On little-endian platforms (all platforms that matter), the input is read directly as 32-bit words
 *   instead of being assembled one byte at a time.
 * - Each 64-byte block is loaded into local variables once and the 64 steps are fully unrolled.
 * - Scratch buffers are reused between calls so hashing small inputs does not allocate.
 *
 * The unrolled steps were generated from RFC 1321; K[i] = floor(abs(sin(i + 1)) * 2^32) as signed int32.
 */

const isLittleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

const HEX = [];
for (let i = 0; i < 256; i++) {
    HEX.push((i < 16 ? '0' : '') + i.toString(16));
}

// Hash state between calls to processWords.
let h0 = 0;
let h1 = 0;
let h2 = 0;
let h3 = 0;

// Holds final 1 or 2 blocks containing remaining data, padding, and length.
const tailBytes = new Uint8Array(128);
const tailWords = new Int32Array(tailBytes.buffer);

// Used when input is not 4-byte aligned or platform is big-endian. Size must be a multiple of 64.
const SCRATCH_SIZE = 64 * 1024;
let scratchBytes = null;
let scratchWords = null;

/**
 * Process complete 64-byte blocks, updating h0-h3.
 * @param {Int32Array} x Little-endian 32-bit words.
 * @param {number} end Number of words to process from start of x (multiple of 16).
 */
const processWords = (x, end) => {
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;

    for (let i = 0; i < end; i += 16) {
        const oa = a;
        const ob = b;
        const oc = c;
        const od = d;

        const x0 = x[i + 0];
        const x1 = x[i + 1];
        const x2 = x[i + 2];
        const x3 = x[i + 3];
        const x4 = x[i + 4];
        const x5 = x[i + 5];
        const x6 = x[i + 6];
        const x7 = x[i + 7];
        const x8 = x[i + 8];
        const x9 = x[i + 9];
        const x10 = x[i + 10];
        const x11 = x[i + 11];
        const x12 = x[i + 12];
        const x13 = x[i + 13];
        const x14 = x[i + 14];
        const x15 = x[i + 15];

        // Round 1
        a = (a + (d ^ (b & (c ^ d))) + x0 - 680876936) | 0;
        a = (((a << 7) | (a >>> 25)) + b) | 0;
        d = (d + (c ^ (a & (b ^ c))) + x1 - 389564586) | 0;
        d = (((d << 12) | (d >>> 20)) + a) | 0;
        c = (c + (b ^ (d & (a ^ b))) + x2 + 606105819) | 0;
        c = (((c << 17) | (c >>> 15)) + d) | 0;
        b = (b + (a ^ (c & (d ^ a))) + x3 - 1044525330) | 0;
        b = (((b << 22) | (b >>> 10)) + c) | 0;
        a = (a + (d ^ (b & (c ^ d))) + x4 - 176418897) | 0;
        a = (((a << 7) | (a >>> 25)) + b) | 0;
        d = (d + (c ^ (a & (b ^ c))) + x5 + 1200080426) | 0;
        d = (((d << 12) | (d >>> 20)) + a) | 0;
        c = (c + (b ^ (d & (a ^ b))) + x6 - 1473231341) | 0;
        c = (((c << 17) | (c >>> 15)) + d) | 0;
        b = (b + (a ^ (c & (d ^ a))) + x7 - 45705983) | 0;
        b = (((b << 22) | (b >>> 10)) + c) | 0;
        a = (a + (d ^ (b & (c ^ d))) + x8 + 1770035416) | 0;
        a = (((a << 7) | (a >>> 25)) + b) | 0;
        d = (d + (c ^ (a & (b ^ c))) + x9 - 1958414417) | 0;
        d = (((d << 12) | (d >>> 20)) + a) | 0;
        c = (c + (b ^ (d & (a ^ b))) + x10 - 42063) | 0;
        c = (((c << 17) | (c >>> 15)) + d) | 0;
        b = (b + (a ^ (c & (d ^ a))) + x11 - 1990404162) | 0;
        b = (((b << 22) | (b >>> 10)) + c) | 0;
        a = (a + (d ^ (b & (c ^ d))) + x12 + 1804603682) | 0;
        a = (((a << 7) | (a >>> 25)) + b) | 0;
        d = (d + (c ^ (a & (b ^ c))) + x13 - 40341101) | 0;
        d = (((d << 12) | (d >>> 20)) + a) | 0;
        c = (c + (b ^ (d & (a ^ b))) + x14 - 1502002290) | 0;
        c = (((c << 17) | (c >>> 15)) + d) | 0;
        b = (b + (a ^ (c & (d ^ a))) + x15 + 1236535329) | 0;
        b = (((b << 22) | (b >>> 10)) + c) | 0;
        // Round 2
        a = (a + (c ^ (d & (b ^ c))) + x1 - 165796510) | 0;
        a = (((a << 5) | (a >>> 27)) + b) | 0;
        d = (d + (b ^ (c & (a ^ b))) + x6 - 1069501632) | 0;
        d = (((d << 9) | (d >>> 23)) + a) | 0;
        c = (c + (a ^ (b & (d ^ a))) + x11 + 643717713) | 0;
        c = (((c << 14) | (c >>> 18)) + d) | 0;
        b = (b + (d ^ (a & (c ^ d))) + x0 - 373897302) | 0;
        b = (((b << 20) | (b >>> 12)) + c) | 0;
        a = (a + (c ^ (d & (b ^ c))) + x5 - 701558691) | 0;
        a = (((a << 5) | (a >>> 27)) + b) | 0;
        d = (d + (b ^ (c & (a ^ b))) + x10 + 38016083) | 0;
        d = (((d << 9) | (d >>> 23)) + a) | 0;
        c = (c + (a ^ (b & (d ^ a))) + x15 - 660478335) | 0;
        c = (((c << 14) | (c >>> 18)) + d) | 0;
        b = (b + (d ^ (a & (c ^ d))) + x4 - 405537848) | 0;
        b = (((b << 20) | (b >>> 12)) + c) | 0;
        a = (a + (c ^ (d & (b ^ c))) + x9 + 568446438) | 0;
        a = (((a << 5) | (a >>> 27)) + b) | 0;
        d = (d + (b ^ (c & (a ^ b))) + x14 - 1019803690) | 0;
        d = (((d << 9) | (d >>> 23)) + a) | 0;
        c = (c + (a ^ (b & (d ^ a))) + x3 - 187363961) | 0;
        c = (((c << 14) | (c >>> 18)) + d) | 0;
        b = (b + (d ^ (a & (c ^ d))) + x8 + 1163531501) | 0;
        b = (((b << 20) | (b >>> 12)) + c) | 0;
        a = (a + (c ^ (d & (b ^ c))) + x13 - 1444681467) | 0;
        a = (((a << 5) | (a >>> 27)) + b) | 0;
        d = (d + (b ^ (c & (a ^ b))) + x2 - 51403784) | 0;
        d = (((d << 9) | (d >>> 23)) + a) | 0;
        c = (c + (a ^ (b & (d ^ a))) + x7 + 1735328473) | 0;
        c = (((c << 14) | (c >>> 18)) + d) | 0;
        b = (b + (d ^ (a & (c ^ d))) + x12 - 1926607734) | 0;
        b = (((b << 20) | (b >>> 12)) + c) | 0;
        // Round 3
        a = (a + (b ^ c ^ d) + x5 - 378558) | 0;
        a = (((a << 4) | (a >>> 28)) + b) | 0;
        d = (d + (a ^ b ^ c) + x8 - 2022574463) | 0;
        d = (((d << 11) | (d >>> 21)) + a) | 0;
        c = (c + (d ^ a ^ b) + x11 + 1839030562) | 0;
        c = (((c << 16) | (c >>> 16)) + d) | 0;
        b = (b + (c ^ d ^ a) + x14 - 35309556) | 0;
        b = (((b << 23) | (b >>> 9)) + c) | 0;
        a = (a + (b ^ c ^ d) + x1 - 1530992060) | 0;
        a = (((a << 4) | (a >>> 28)) + b) | 0;
        d = (d + (a ^ b ^ c) + x4 + 1272893353) | 0;
        d = (((d << 11) | (d >>> 21)) + a) | 0;
        c = (c + (d ^ a ^ b) + x7 - 155497632) | 0;
        c = (((c << 16) | (c >>> 16)) + d) | 0;
        b = (b + (c ^ d ^ a) + x10 - 1094730640) | 0;
        b = (((b << 23) | (b >>> 9)) + c) | 0;
        a = (a + (b ^ c ^ d) + x13 + 681279174) | 0;
        a = (((a << 4) | (a >>> 28)) + b) | 0;
        d = (d + (a ^ b ^ c) + x0 - 358537222) | 0;
        d = (((d << 11) | (d >>> 21)) + a) | 0;
        c = (c + (d ^ a ^ b) + x3 - 722521979) | 0;
        c = (((c << 16) | (c >>> 16)) + d) | 0;
        b = (b + (c ^ d ^ a) + x6 + 76029189) | 0;
        b = (((b << 23) | (b >>> 9)) + c) | 0;
        a = (a + (b ^ c ^ d) + x9 - 640364487) | 0;
        a = (((a << 4) | (a >>> 28)) + b) | 0;
        d = (d + (a ^ b ^ c) + x12 - 421815835) | 0;
        d = (((d << 11) | (d >>> 21)) + a) | 0;
        c = (c + (d ^ a ^ b) + x15 + 530742520) | 0;
        c = (((c << 16) | (c >>> 16)) + d) | 0;
        b = (b + (c ^ d ^ a) + x2 - 995338651) | 0;
        b = (((b << 23) | (b >>> 9)) + c) | 0;
        // Round 4
        a = (a + (c ^ (b | ~d)) + x0 - 198630844) | 0;
        a = (((a << 6) | (a >>> 26)) + b) | 0;
        d = (d + (b ^ (a | ~c)) + x7 + 1126891415) | 0;
        d = (((d << 10) | (d >>> 22)) + a) | 0;
        c = (c + (a ^ (d | ~b)) + x14 - 1416354905) | 0;
        c = (((c << 15) | (c >>> 17)) + d) | 0;
        b = (b + (d ^ (c | ~a)) + x5 - 57434055) | 0;
        b = (((b << 21) | (b >>> 11)) + c) | 0;
        a = (a + (c ^ (b | ~d)) + x12 + 1700485571) | 0;
        a = (((a << 6) | (a >>> 26)) + b) | 0;
        d = (d + (b ^ (a | ~c)) + x3 - 1894986606) | 0;
        d = (((d << 10) | (d >>> 22)) + a) | 0;
        c = (c + (a ^ (d | ~b)) + x10 - 1051523) | 0;
        c = (((c << 15) | (c >>> 17)) + d) | 0;
        b = (b + (d ^ (c | ~a)) + x1 - 2054922799) | 0;
        b = (((b << 21) | (b >>> 11)) + c) | 0;
        a = (a + (c ^ (b | ~d)) + x8 + 1873313359) | 0;
        a = (((a << 6) | (a >>> 26)) + b) | 0;
        d = (d + (b ^ (a | ~c)) + x15 - 30611744) | 0;
        d = (((d << 10) | (d >>> 22)) + a) | 0;
        c = (c + (a ^ (d | ~b)) + x6 - 1560198380) | 0;
        c = (((c << 15) | (c >>> 17)) + d) | 0;
        b = (b + (d ^ (c | ~a)) + x13 + 1309151649) | 0;
        b = (((b << 21) | (b >>> 11)) + c) | 0;
        a = (a + (c ^ (b | ~d)) + x4 - 145523070) | 0;
        a = (((a << 6) | (a >>> 26)) + b) | 0;
        d = (d + (b ^ (a | ~c)) + x11 - 1120210379) | 0;
        d = (((d << 10) | (d >>> 22)) + a) | 0;
        c = (c + (a ^ (d | ~b)) + x2 + 718787259) | 0;
        c = (((c << 15) | (c >>> 17)) + d) | 0;
        b = (b + (d ^ (c | ~a)) + x9 - 343485551) | 0;
        b = (((b << 21) | (b >>> 11)) + c) | 0;

        a = (a + oa) | 0;
        b = (b + ob) | 0;
        c = (c + oc) | 0;
        d = (d + od) | 0;
    }

    h0 = a;
    h1 = b;
    h2 = c;
    h3 = d;
};

/**
 * Copy bytes into scratchWords as little-endian words regardless of platform endianness or alignment.
 * @param {Uint8Array} bytes Source.
 * @param {number} offset Byte offset in source.
 * @param {number} length Number of bytes to copy (multiple of 4, at most SCRATCH_SIZE).
 */
const copyToScratch = (bytes, offset, length) => {
    if (isLittleEndian) {
        scratchBytes.set(bytes.subarray(offset, offset + length));
    } else {
        for (let j = 0; j < length; j += 4) {
            const p = offset + j;
            scratchWords[j >> 2] = bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16) | (bytes[p + 3] << 24);
        }
    }
};

/**
 * @param {Uint8Array} bytes Data to hash.
 * @returns {string} Lowercase hex MD5 digest.
 */
const md5Bytes = bytes => {
    const length = bytes.length;
    const fullBlockBytes = length & ~63;

    h0 = 0x67452301;
    h1 = 0xefcdab89 | 0;
    h2 = 0x98badcfe | 0;
    h3 = 0x10325476;

    if (fullBlockBytes !== 0) {
        if (isLittleEndian && (bytes.byteOffset & 3) === 0) {
            processWords(new Int32Array(bytes.buffer, bytes.byteOffset, fullBlockBytes >> 2), fullBlockBytes >> 2);
        } else {
            if (!scratchBytes) {
                scratchBytes = new Uint8Array(SCRATCH_SIZE);
                scratchWords = new Int32Array(scratchBytes.buffer);
            }
            for (let offset = 0; offset < fullBlockBytes; offset += SCRATCH_SIZE) {
                const chunkLength = Math.min(SCRATCH_SIZE, fullBlockBytes - offset);
                copyToScratch(bytes, offset, chunkLength);
                processWords(scratchWords, chunkLength >> 2);
            }
        }
    }

    const remaining = length - fullBlockBytes;
    const tailLength = remaining < 56 ? 64 : 128;
    tailBytes.fill(0);
    tailBytes.set(bytes.subarray(fullBlockBytes));
    tailBytes[remaining] = 0x80;
    // Length in bits as a 64-bit little-endian integer.
    const bitLengthLow = length << 3;
    const bitLengthHigh = Math.floor(length / 0x20000000);
    for (let j = 0; j < 4; j++) {
        tailBytes[tailLength - 8 + j] = bitLengthLow >>> (j * 8);
        tailBytes[tailLength - 4 + j] = bitLengthHigh >>> (j * 8);
    }
    if (!isLittleEndian) {
        for (let j = 0; j < 32; j++) {
            const p = j << 2;
            tailWords[j] = tailBytes[p] | (tailBytes[p + 1] << 8) | (tailBytes[p + 2] << 16) | (tailBytes[p + 3] << 24);
        }
    }
    processWords(tailWords, tailLength >> 2);

    return (
        HEX[h0 & 0xff] + HEX[(h0 >>> 8) & 0xff] + HEX[(h0 >>> 16) & 0xff] + HEX[h0 >>> 24] +
        HEX[h1 & 0xff] + HEX[(h1 >>> 8) & 0xff] + HEX[(h1 >>> 16) & 0xff] + HEX[h1 >>> 24] +
        HEX[h2 & 0xff] + HEX[(h2 >>> 8) & 0xff] + HEX[(h2 >>> 16) & 0xff] + HEX[h2 >>> 24] +
        HEX[h3 & 0xff] + HEX[(h3 >>> 8) & 0xff] + HEX[(h3 >>> 16) & 0xff] + HEX[h3 >>> 24]
    );
};

/**
 * Compute the MD5 hash of some data.
 * @param {ArrayBuffer|ArrayBufferView|string|number[]} data Data to hash. Strings are encoded as UTF-8.
 * @returns {string} Lowercase hex MD5 digest.
 */
const md5 = data => {
    if (typeof data === 'string') {
        return md5Bytes(new TextEncoder().encode(data));
    }
    // Avoid instanceof as typed arrays may come from a different realm.
    if (ArrayBuffer.isView(data)) {
        return md5Bytes(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    }
    if (Array.isArray(data) || (data && typeof data.byteLength === 'number')) {
        // Array of bytes or ArrayBuffer
        return md5Bytes(new Uint8Array(data));
    }
    throw new TypeError('md5: unsupported input type');
};

module.exports = md5;
