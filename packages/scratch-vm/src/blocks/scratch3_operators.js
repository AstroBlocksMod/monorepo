const Cast = require('../util/cast.js');
const MathUtil = require('../util/math-util.js');

class Scratch3OperatorsBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            operator_add: this.add,
            operator_subtract: this.subtract,
            operator_multiply: this.multiply,
            operator_divide: this.divide,
            operator_lt: this.lt,
            operator_equals: this.equals,
            operator_gt: this.gt,
            operator_and: this.and,
            operator_or: this.or,
            operator_not: this.not,
            operator_random: this.random,
            operator_join: this.join,
            operator_letter_of: this.letterOf,
            operator_length: this.length,
            operator_contains: this.contains,
            operator_mod: this.mod,
            operator_round: this.round,
            operator_mathop: this.mathop,

            // Merged in from the Text, Utilities and Lily's Toolbox extensions.
            operator_letters_of: this.lettersOf,
            operator_split: this.split,
            operator_count: this.count,
            operator_indexof: this.indexOf,
            operator_replace: this.replace,
            operator_replacefirst: this.replaceFirst,
            operator_repeattext: this.repeatText,
            operator_reverse: this.reverse,
            operator_trim: this.trim,
            operator_tocase: this.toCase,
            operator_iscase: this.isCase,
            operator_poswith: this.posWith,
            operator_identical: this.identical,
            operator_unicodeof: this.unicodeOf,
            operator_unicodefrom: this.unicodeFrom,
            operator_newline: this.newline,
            operator_encode: this.encode,
            operator_decode: this.decode,
            operator_stringtype: this.stringType,
            operator_replaceregex: this.replaceRegex,
            operator_matchregex: this.matchRegex,
            operator_matchregexall: this.matchRegexAll,
            operator_testregex: this.testRegex,
            operator_countregex: this.countRegex,
            operator_parsejson: this.parseJSON,
            operator_le: this.le,
            operator_ge: this.ge,
            operator_notequal: this.notEqual,
            operator_nand: this.nand,
            operator_nor: this.nor,
            operator_xor: this.xor,
            operator_xnor: this.xnor,
            operator_true: this.true,
            operator_false: this.false,
            operator_boolify: this.boolify,
            operator_ternary: this.ternary,
            operator_exponent: this.exponent,
            operator_root: this.root,
            operator_negative: this.negative,
            operator_pi: this.pi,
            operator_clamp: this.clamp,
            operator_sign: this.sign,
            operator_brightness: this.brightness,
            operator_stringvalue: this.stringValue,
            operator_colour: this.colour,
            operator_angle: this.angle,
            operator_note: this.note,
            operator_matrix: this.matrix
        };
    }

    add (args) {
        return Cast.toNumber(args.NUM1) + Cast.toNumber(args.NUM2);
    }

    subtract (args) {
        return Cast.toNumber(args.NUM1) - Cast.toNumber(args.NUM2);
    }

    multiply (args) {
        return Cast.toNumber(args.NUM1) * Cast.toNumber(args.NUM2);
    }

    divide (args) {
        return Cast.toNumber(args.NUM1) / Cast.toNumber(args.NUM2);
    }

    lt (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) < 0;
    }

    equals (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) === 0;
    }

    gt (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) > 0;
    }

    and (args) {
        return Cast.toBoolean(args.OPERAND1) && Cast.toBoolean(args.OPERAND2);
    }

    or (args) {
        return Cast.toBoolean(args.OPERAND1) || Cast.toBoolean(args.OPERAND2);
    }

    not (args) {
        return !Cast.toBoolean(args.OPERAND);
    }

    random (args) {
        return this._random(args.FROM, args.TO);
    }
    _random (from, to) { // used by compiler
        const nFrom = Cast.toNumber(from);
        const nTo = Cast.toNumber(to);
        const low = nFrom <= nTo ? nFrom : nTo;
        const high = nFrom <= nTo ? nTo : nFrom;
        if (low === high) return low;
        // If both arguments are ints, truncate the result to an int.
        if (Cast.isInt(from) && Cast.isInt(to)) {
            return low + Math.floor(Math.random() * ((high + 1) - low));
        }
        return (Math.random() * (high - low)) + low;
    }

    join (args) {
        return Cast.toString(args.STRING1) + Cast.toString(args.STRING2);
    }

    letterOf (args) {
        const index = Cast.toNumber(args.LETTER) - 1;
        const str = Cast.toString(args.STRING);
        // Out of bounds?
        if (index < 0 || index >= str.length) {
            return '';
        }
        return str.charAt(index);
    }

    length (args) {
        return Cast.toString(args.STRING).length;
    }

    contains (args) {
        const format = function (string) {
            return Cast.toString(string).toLowerCase();
        };
        return format(args.STRING1).includes(format(args.STRING2));
    }

    mod (args) {
        const n = Cast.toNumber(args.NUM1);
        const modulus = Cast.toNumber(args.NUM2);
        let result = n % modulus;
        // Scratch mod uses floored division instead of truncated division.
        if (result / modulus < 0) result += modulus;
        return result;
    }

    round (args) {
        return Math.round(Cast.toNumber(args.NUM));
    }

    mathop (args) {
        const operator = Cast.toString(args.OPERATOR).toLowerCase();
        const n = Cast.toNumber(args.NUM);
        switch (operator) {
        case 'abs': return Math.abs(n);
        case 'floor': return Math.floor(n);
        case 'ceiling': return Math.ceil(n);
        case 'sqrt': return Math.sqrt(n);
        case 'sin': return Math.round(Math.sin((Math.PI * n) / 180) * 1e10) / 1e10;
        case 'cos': return Math.round(Math.cos((Math.PI * n) / 180) * 1e10) / 1e10;
        case 'tan': return MathUtil.tan(n);
        case 'asin': return (Math.asin(n) * 180) / Math.PI;
        case 'acos': return (Math.acos(n) * 180) / Math.PI;
        case 'atan': return (Math.atan(n) * 180) / Math.PI;
        case 'ln': return Math.log(n);
        case 'log': return Math.log(n) / Math.LN10;
        case 'e ^': return Math.exp(n);
        case '10 ^': return Math.pow(10, n);
        }
        return 0;
    }

    /**
     * Build a regular expression that matches `str` literally, ignoring case.
     * The merged Text blocks are all case-insensitive, matching the behaviour of
     * the core `letter of` and `contains` blocks.
     * @param {string} str The string to match literally.
     * @returns {RegExp} A global, case-insensitive regular expression.
     */
    static literalRegex (str) {
        return new RegExp(str.replace(/[^a-zA-Z0-9]/g, '\\$&'), 'gi');
    }

    lettersOf (args) {
        const str = Cast.toString(args.STRING);
        const first = Cast.toNumber(args.LETTER1);
        const last = Cast.toNumber(args.LETTER2);
        return str.substring(first - 1, last);
    }

    split (args) {
        const str = Cast.toString(args.STRING);
        const delimiter = Cast.toString(args.SPLIT);
        const index = Cast.toNumber(args.ITEM);
        const parts = str.split(Scratch3OperatorsBlocks.literalRegex(delimiter));
        return parts[index - 1] || '';
    }

    count (args) {
        const str = Cast.toString(args.STRING);
        const substring = Cast.toString(args.SUBSTRING);
        return str.split(Scratch3OperatorsBlocks.literalRegex(substring)).length - 1;
    }

    indexOf (args) {
        const str = Cast.toString(args.STRING).toLowerCase();
        const substring = Cast.toString(args.SUBSTRING).toLowerCase();
        // indexOf reports -1 when there is no match, which becomes 0 after the +1.
        return str.indexOf(substring) + 1;
    }

    replace (args) {
        const str = Cast.toString(args.STRING);
        const substring = Cast.toString(args.SUBSTRING);
        const replacement = Cast.toString(args.REPLACE);
        return str.replace(Scratch3OperatorsBlocks.literalRegex(substring), replacement);
    }

    replaceFirst (args) {
        const str = Cast.toString(args.STRING);
        const substring = Cast.toString(args.SUBSTRING);
        const replacement = Cast.toString(args.REPLACE);
        return str.replace(substring, replacement);
    }

    repeatText (args) {
        const str = Cast.toString(args.STRING);
        const times = Math.floor(Cast.toNumber(args.REPEAT));
        if (times < 0 || !Number.isFinite(times)) {
            return '';
        }
        return str.repeat(times);
    }

    reverse (args) {
        return Array.from(Cast.toString(args.STRING)).reverse()
            .join('');
    }

    trim (args) {
        const str = Cast.toString(args.STRING);
        switch (Cast.toString(args.METHOD)) {
        case 'start': return str.trimStart();
        case 'end': return str.trimEnd();
        default: return str.trim();
        }
    }

    toCase (args) {
        const str = Cast.toString(args.STRING);
        switch (Cast.toString(args.TEXTCASE)) {
        case 'lowercase':
            return str.toLowerCase();
        case 'uppercase':
            return str.toUpperCase();
        case 'mixedcase':
            return Array.from(str)
                .map((char, index) => (index % 2 === 0 ? char.toUpperCase() : char.toLowerCase()))
                .join('');
        case 'titlecase':
            return str.split(/\b/g)
                .map(word => (word ? word[0].toUpperCase() + word.substring(1) : ''))
                .join('');
        case 'exacttitlecase':
            return str.split(/\b/g)
                .map(word => (word ? word[0].toUpperCase() + word.substring(1).toLowerCase() : ''))
                .join('');
        case 'sentencecase': {
            let result = '';
            let capitalized = false;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if (/^\s*$/.test(str[i - 1] ?? ' ') && !capitalized &&
                        char.toUpperCase() !== char.toLowerCase()) {
                    result += char.toUpperCase();
                    capitalized = true;
                } else {
                    if (char === '.' || char === '!' || char === '?') {
                        capitalized = false;
                    }
                    result += char.toLowerCase();
                }
            }
            return result;
        }
        case 'randomcase':
            return Array.from(str)
                .map(char => (Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase()))
                .join('');
        case 'camelcase': {
            let result = '';
            for (let i = 0; i < str.length; i++) {
                if (/^\s*$/.test(str[i - 1] ?? 'x')) {
                    result += str[i].toUpperCase();
                } else {
                    result += str[i].toLowerCase();
                }
            }
            return result.replace(/\s/g, '');
        }
        default:
            return str;
        }
    }

    isCase (args) {
        const str = Cast.toString(args.STRING);
        switch (Cast.toString(args.TEXTCASE)) {
        case 'lowercase':
            return str.toLowerCase() === str;
        case 'uppercase':
            return str.toUpperCase() === str;
        case 'mixedcase':
            return !(str.toUpperCase() === str || str.toLowerCase() === str);
        case 'titlecase':
            return str.split(/\b/g).every(word => !word || word === word[0].toUpperCase() + word.substring(1));
        case 'exacttitlecase':
            return str.split(/\b/g).every(word =>
                !word || word === word[0].toUpperCase() + word.substring(1).toLowerCase());
        case 'camelcase':
            return /^[^A-Z\s][^\s]*$/.test(str);
        case 'randomcase':
            return true;
        case 'sentencecase':
            return /^[A-Z][^?.!]*(?:[?.!]\s+[A-Z][^?.!]*)*$/.test(str);
        default:
            return false;
        }
    }

    posWith (args) {
        const str = Cast.toString(args.STRING);
        const substring = Cast.toString(args.SUBSTRING);
        if (Cast.toString(args.POSITION) === 'starts') {
            return str.startsWith(substring);
        }
        return str.endsWith(substring);
    }

    identical (args) {
        // Deliberately not cast: this block exists to tell types apart.
        return args.OPERAND1 === args.OPERAND2;
    }

    unicodeOf (args) {
        return Array.from(Cast.toString(args.STRING))
            .map(char => char.charCodeAt(0))
            .join(' ');
    }

    unicodeFrom (args) {
        return String.fromCharCode(Cast.toNumber(args.NUM));
    }

    newline () {
        return '\n';
    }

    encode (args) {
        const str = Cast.toString(args.STRING);
        if (str === '') return '';
        switch (Cast.toString(args.CODING)) {
        case 'base64':
            return btoa(unescape(encodeURIComponent(str)));
        case 'binary':
            return Array.from(str).map(char => char.charCodeAt(0).toString(2))
                .join(' ');
        case 'uri':
            return encodeURIComponent(str);
        default:
            return '';
        }
    }

    decode (args) {
        const str = Cast.toString(args.STRING);
        if (str === '') return '';
        try {
            switch (Cast.toString(args.CODING)) {
            case 'base64':
                return decodeURIComponent(escape(atob(str)));
            case 'binary':
                return str.split(' ').map(part => String.fromCharCode(parseInt(part, 2)))
                    .join('');
            case 'uri':
                return decodeURIComponent(str);
            default:
                return '';
            }
        } catch (e) {
            return '';
        }
    }

    stringType (args) {
        const str = Cast.toString(args.STRING);
        if (Cast.toString(args.TYPE) === 'number') {
            return str.trim() !== '' && !isNaN(Number(str));
        }
        return str.trim() === '' || isNaN(Number(str));
    }

    replaceRegex (args) {
        try {
            const regex = new RegExp(Cast.toString(args.REGEX), Cast.toString(args.FLAGS));
            return Cast.toString(args.STRING).replace(regex, Cast.toString(args.REPLACE));
        } catch (e) {
            return '';
        }
    }

    /**
     * Every match of a regular expression in a string.
     * @param {object} args The block arguments.
     * @returns {Array.<string>} The matches, or an empty array if the regex is invalid.
     */
    static allMatches (args) {
        try {
            const flags = Cast.toString(args.FLAGS);
            const regex = new RegExp(Cast.toString(args.REGEX), flags.includes('g') ? flags : `${flags}g`);
            return Cast.toString(args.STRING).match(regex) || [];
        } catch (e) {
            return [];
        }
    }

    matchRegex (args) {
        return Scratch3OperatorsBlocks.allMatches(args)[Cast.toNumber(args.ITEM) - 1] || '';
    }

    matchRegexAll (args) {
        return JSON.stringify(Scratch3OperatorsBlocks.allMatches(args));
    }

    countRegex (args) {
        return Scratch3OperatorsBlocks.allMatches(args).length;
    }

    testRegex (args) {
        try {
            const regex = new RegExp(Cast.toString(args.REGEX), Cast.toString(args.FLAGS));
            return regex.test(Cast.toString(args.STRING));
        } catch (e) {
            return false;
        }
    }

    parseJSON (args) {
        const path = Cast.toString(args.PATH)
            .split('/')
            .map(part => decodeURIComponent(part))
            .filter((part, index, parts) => !(part === '' && (index === 0 || index === parts.length - 1)));
        let json;
        try {
            json = JSON.parse(Cast.toString(args.JSON_STRING));
        } catch (e) {
            return '';
        }
        for (const part of path) {
            if (json === null || typeof json !== 'object' ||
                    !Object.prototype.hasOwnProperty.call(json, part)) {
                return '';
            }
            json = json[part];
        }
        if (json === null) return 'null';
        if (typeof json === 'undefined') return '';
        if (typeof json === 'object') return JSON.stringify(json);
        return `${json}`;
    }

    le (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) <= 0;
    }

    ge (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) >= 0;
    }

    notEqual (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) !== 0;
    }

    nand (args) {
        return !(Cast.toBoolean(args.OPERAND1) && Cast.toBoolean(args.OPERAND2));
    }

    nor (args) {
        return !(Cast.toBoolean(args.OPERAND1) || Cast.toBoolean(args.OPERAND2));
    }

    xor (args) {
        return Cast.toBoolean(args.OPERAND1) !== Cast.toBoolean(args.OPERAND2);
    }

    xnor (args) {
        return Cast.toBoolean(args.OPERAND1) === Cast.toBoolean(args.OPERAND2);
    }

    true () {
        return true;
    }

    false () {
        return false;
    }

    boolify (args) {
        return Cast.toBoolean(args.STRING);
    }

    ternary (args) {
        return Cast.toBoolean(args.CONDITION) ? args.TRUEVALUE : args.FALSEVALUE;
    }

    exponent (args) {
        return Math.pow(Cast.toNumber(args.NUM1), Cast.toNumber(args.NUM2));
    }

    root (args) {
        const degree = Cast.toNumber(args.NUM1);
        const radicand = Cast.toNumber(args.NUM2);
        if (degree === 0) return 0;
        // Math.pow(-8, 1/3) is NaN, so handle odd roots of negatives by hand.
        if (radicand < 0 && Math.abs(degree % 2) === 1) {
            return -Math.pow(-radicand, 1 / degree);
        }
        return Math.pow(radicand, 1 / degree);
    }

    negative (args) {
        return -Cast.toNumber(args.NUM);
    }

    pi () {
        return Math.PI;
    }

    clamp (args) {
        const value = Cast.toNumber(args.NUM);
        const min = Cast.toNumber(args.MIN);
        const max = Cast.toNumber(args.MAX);
        if (min > max) {
            return Math.min(Math.max(value, max), min);
        }
        return Math.min(Math.max(value, min), max);
    }

    sign (args) {
        return Math.sign(Cast.toNumber(args.NUM)) || 0;
    }

    brightness (args) {
        // https://www.w3.org/TR/AERT/#color-contrast
        const {r, g, b} = Cast.toRgbColorObject(args.COLOR);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
    }

    stringValue (args) {
        return args.STRING;
    }

    colour (args) {
        return Cast.toString(args.COLOR);
    }

    angle (args) {
        return Cast.toNumber(args.ANGLE);
    }

    note (args) {
        return Cast.toNumber(args.NOTE);
    }

    matrix (args) {
        return Cast.toString(args.MATRIX);
    }
}

module.exports = Scratch3OperatorsBlocks;
