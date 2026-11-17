/**
 * @fileoverview
 * Reference values: the one kind of value in AstroBlocks that is not a number, a string or a boolean.
 *
 * Scratch values are primitives, and every block, monitor and file format assumes so. A reference is an
 * object that stands for something else (an instance of a class, a function) and behaves like its label
 * wherever a primitive is expected:
 *
 * - as text it is its label, which is unique to it ("Enemy #3"), so `join`, `say` and monitors show it
 * - as a number it is 0, like any other text that is not a number
 * - as a boolean it is true, like any other non-empty text
 * - it equals itself and its own label, and nothing else, because Scratch compares text that is not a
 *   number as text and no two references share a label
 * - saved in a project it becomes its label. What it pointed at is not saved, the same as clones are not
 *
 * None of that needs a change to the blocks that already exist: they convert values with `String()`,
 * `Number()` and `JSON.stringify()`, and this class answers all three.
 */

/**
 * How many labels have been handed out for each name, so that every label is given out once.
 * Counts are never reset: a reference kept from an earlier run must not equal a new one.
 * @type {Map<string, number>}
 */
const labelCounts = new Map();

class Reference {
    /**
     * @param {string} label What this reference looks like as text. Use Reference.createLabel() unless the
     * label is already known to be unique.
     */
    constructor (label) {
        /**
         * @type {string}
         * @readonly
         */
        this.label = label;
    }

    /**
     * Make a label that no other reference has.
     * @param {string} name What the reference points at, such as the name of its class.
     * @returns {string} The name followed by a number, like "Enemy #3".
     */
    static createLabel (name) {
        const count = (labelCounts.get(name) || 0) + 1;
        labelCounts.set(name, count);
        return `${name} #${count}`;
    }

    /**
     * @param {unknown} value Any value.
     * @returns {boolean} True if the value is a reference.
     */
    static isReference (value) {
        return value instanceof Reference;
    }

    /**
     * Turn a value into something that is safe to hand to code that only knows Scratch's primitives and
     * lists of them, such as the editor's monitors or a sandboxed extension.
     * @param {unknown} value Any value.
     * @returns {unknown} The label if the value is a reference, a copy with labels in place of references
     * if it is a list holding any, and otherwise the value itself.
     */
    static toPlain (value) {
        if (value instanceof Reference) {
            return value.label;
        }
        if (Array.isArray(value) && value.some(Reference.isReference)) {
            return value.map(Reference.toPlain);
        }
        return value;
    }

    /**
     * Reference.toPlain() for the arguments of a block.
     * @param {object} args Argument values by name.
     * @returns {object} The same object if it held no reference, otherwise a copy with labels in place of them.
     */
    static toPlainArguments (args) {
        let result = args;
        for (const name in args) {
            if (!Object.prototype.hasOwnProperty.call(args, name)) continue;
            const plain = Reference.toPlain(args[name]);
            if (plain !== args[name]) {
                if (result === args) result = Object.assign({}, args);
                result[name] = plain;
            }
        }
        return result;
    }

    /**
     * Whether what this reference points at still exists. Subclasses override this.
     * @returns {boolean} False once the reference is dangling.
     */
    get isAlive () {
        return true;
    }

    toString () {
        return this.label;
    }

    toJSON () {
        return this.label;
    }
}

module.exports = Reference;
