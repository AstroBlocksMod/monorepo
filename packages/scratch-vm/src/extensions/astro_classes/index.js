// astro: Sprites as classes. See astro/objects.js for how they work.

const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const xmlEscape = require('../../util/xml-escape');
const ObjectService = require('../../astro/objects');
const PaletteRefresher = require('../../astro/palette-refresher');

const EXTENSION_ID = ObjectService.EXTENSION_ID;

// Icon made for AstroBlocks: an outline and a filled copy of it, a class and an instance.
const iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="20" fill="#3f51b5"/>' +
    '<rect x="9.5" y="9.5" width="14" height="14" rx="3" fill="none" stroke="#fff" stroke-width="3"/>' +
    '<rect x="17" y="17" width="14" height="14" rx="3" fill="#fff"/></svg>';
const iconURI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSVG)}`;

/**
 * Write the palette entry for a call block.
 * @param {string} procedureCode The call block's proccode.
 * @param {Array<string>} argumentIds An ID for each of its inputs.
 * @param {boolean} isReporter True to make a block that gives a value.
 * @param {string} [firstValue] Text to start the first input with.
 * @returns {string} Block XML.
 */
const callBlockXML = (procedureCode, argumentIds, isReporter, firstValue) => {
    let xml = '<block type="procedures_call" gap="16"><mutation';
    xml += ` proccode="${xmlEscape(procedureCode)}"`;
    xml += ` argumentids="${xmlEscape(JSON.stringify(argumentIds))}"`;
    xml += ' warp="false"';
    // Makes the editor give each input something to type into, as it does for the sprite's own
    // custom blocks.
    xml += ' generateshadows="true"';
    if (isReporter) xml += ' return="1"';
    xml += '></mutation>';
    if (typeof firstValue === 'string') {
        xml += `<value name="${xmlEscape(argumentIds[0])}"><shadow type="text">`;
        xml += `<field name="TEXT">${xmlEscape(firstValue)}</field></shadow></value>`;
    }
    xml += '</block>';
    return xml;
};

/**
 * astro: Blocks that treat sprites as classes: make instances, read their fields, call their methods.
 */
class AstroClasses {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.service = ObjectService.for(runtime);

        // The palette lists every class with its constructor and methods, which are other sprites'
        // custom blocks, so it has to follow the project.
        this.palette = new PaletteRefresher(runtime, EXTENSION_ID, () => JSON.stringify(this._describePalette()));
    }

    /**
     * @returns {Array<object>} The palette entries for every class that has a constructor or methods.
     */
    _describePalette () {
        const blocks = [];
        for (const sprite of this.service.classes()) {
            const description = ObjectService.describeClass(sprite);
            // "new [CLASS]" above already covers a constructor that takes nothing.
            const initializer = description.initializer && description.initializer.ids.length > 0 ?
                description.initializer : null;
            if (!initializer && description.methods.length === 0) continue;
            blocks.push('---');
            blocks.push({
                blockType: BlockType.LABEL,
                text: sprite.name
            });
            if (initializer) {
                blocks.push({
                    blockType: BlockType.XML,
                    xml: callBlockXML(
                        ObjectService.constructorCallCode(initializer.procedureCode),
                        [ObjectService.CLASS_ARGUMENT_ID].concat(initializer.ids),
                        true,
                        sprite.name
                    )
                });
            }
            for (const method of description.methods) {
                blocks.push({
                    blockType: BlockType.XML,
                    xml: callBlockXML(
                        `%s ${method.procedureCode}`,
                        [ObjectService.SELF_ARGUMENT_ID].concat(method.ids),
                        method.returns
                    )
                });
            }
        }
        return blocks;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        const classBlocks = this._describePalette();
        this.palette.shown(JSON.stringify(classBlocks));
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'astro_classes.name',
                default: 'Classes',
                description: 'Name of the extension that lets sprites be used as classes.'
            }),
            color1: '#3f51b5',
            color2: '#35449a',
            color3: '#2b377d',
            menuIconURI: iconURI,
            blocks: [
                {
                    opcode: 'newInstance',
                    text: formatMessage({
                        id: 'astro_classes.blocks.newInstance',
                        default: 'new [CLASS]',
                        description: 'Block that makes an instance of a sprite and returns it.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        CLASS: {
                            type: ArgumentType.STRING,
                            menu: 'CLASS_MENU'
                        }
                    }
                },
                {
                    opcode: 'myself',
                    text: formatMessage({
                        id: 'astro_classes.blocks.myself',
                        default: 'myself',
                        description: 'Block that returns the instance the script is running on.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'deleteInstance',
                    text: formatMessage({
                        id: 'astro_classes.blocks.deleteInstance',
                        default: 'delete [OBJECT]',
                        description: 'Block that deletes an instance of a sprite.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                },
                '---',
                {
                    opcode: 'getField',
                    text: formatMessage({
                        id: 'astro_classes.blocks.getField',
                        default: '[FIELD] of [OBJECT]',
                        description: 'Block that returns the value of a variable of an instance.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        FIELD: {
                            type: ArgumentType.STRING,
                            menu: 'FIELD_MENU'
                        },
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                },
                {
                    opcode: 'setField',
                    text: formatMessage({
                        id: 'astro_classes.blocks.setField',
                        default: 'set [FIELD] of [OBJECT] to [VALUE]',
                        description: 'Block that sets the value of a variable of an instance.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        FIELD: {
                            type: ArgumentType.STRING,
                            menu: 'FIELD_MENU'
                        },
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '0'
                        }
                    }
                },
                '---',
                {
                    opcode: 'isA',
                    text: formatMessage({
                        id: 'astro_classes.blocks.isA',
                        default: '[OBJECT] is a [CLASS]?',
                        description: 'Block that checks whether a value is an instance of a sprite.'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        },
                        CLASS: {
                            type: ArgumentType.STRING,
                            menu: 'CLASS_MENU'
                        }
                    }
                },
                {
                    opcode: 'classOf',
                    text: formatMessage({
                        id: 'astro_classes.blocks.classOf',
                        default: 'class of [OBJECT]',
                        description: 'Block that returns the name of the sprite a value is an instance of.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                },
                {
                    opcode: 'exists',
                    text: formatMessage({
                        id: 'astro_classes.blocks.exists',
                        default: '[OBJECT] exists?',
                        description: 'Block that checks whether a value is an instance that has not been deleted.'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    }
                },
                '---',
                {
                    opcode: 'dataClass',
                    text: formatMessage({
                        id: 'astro_classes.blocks.dataClass',
                        default: 'data class',
                        description: 'Block that marks a sprite as one whose instances never show on the stage.'
                    }),
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false
                },
                // What call blocks for another object's constructor and methods run as. The blocks in
                // the palette for those are ordinary custom block calls, listed below.
                {
                    opcode: 'callMethod',
                    text: 'call method',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true
                },
                {
                    opcode: 'construct',
                    text: 'construct',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true
                }
            ].concat(classBlocks),
            menus: {
                CLASS_MENU: {
                    acceptReporters: true,
                    items: 'getClassMenu'
                },
                FIELD_MENU: {
                    acceptReporters: true,
                    items: 'getFieldMenu'
                }
            }
        };
    }

    getClassMenu () {
        const names = this.service.classNames();
        return names.length > 0 ? names : [''];
    }

    getFieldMenu () {
        const names = this.service.fieldNames();
        return names.length > 0 ? names : [''];
    }

    newInstance ({CLASS}, util) {
        const sprite = this.service.classNamed(Cast.toString(CLASS));
        return sprite ? this.service.instantiate(sprite, [], util) : '';
    }

    construct (args, util) {
        const sprite = this.service.classNamed(Cast.toString(args.CLASS));
        return sprite ? this.service.instantiate(sprite, ObjectService.collectArguments(args), util) : '';
    }

    callMethod (args, util) {
        const reference = this.service.resolve(args.SELF);
        if (!reference) return '';
        return this.service.callMethod(
            reference,
            Cast.toString(args.METHOD),
            ObjectService.collectArguments(args),
            util
        );
    }

    myself (args, util) {
        return this.service.referenceFor(util.target);
    }

    deleteInstance ({OBJECT}, util) {
        const reference = this.service.resolve(OBJECT);
        if (!reference) return;
        this.service.destroy(reference);
        // An instance that deletes itself stops there, like "delete this clone". The thread of a
        // method call is not in the runtime's list while it runs inside its caller, so stopping the
        // instance's threads did not reach it.
        if (!reference.isAlive && util.target === reference.target) {
            this.runtime.sequencer.retireThread(util.thread);
        }
    }

    getField ({FIELD, OBJECT}) {
        const reference = this.service.resolve(OBJECT);
        const variable = reference && this.service.fieldOf(reference, Cast.toString(FIELD));
        return variable ? variable.value : '';
    }

    setField ({FIELD, OBJECT, VALUE}) {
        const reference = this.service.resolve(OBJECT);
        const variable = reference && this.service.fieldOf(reference, Cast.toString(FIELD));
        if (variable) {
            variable.value = VALUE;
        }
    }

    isA ({OBJECT, CLASS}) {
        // The type of a sprite takes its instances, and for a protocol the instances that conform.
        const sprite = this.service.classNamed(Cast.toString(CLASS));
        return !!sprite && this.service.typeOfClass(sprite).accepts(OBJECT);
    }

    classOf ({OBJECT}) {
        const reference = this.service.resolve(OBJECT);
        return reference ? reference.typeName : '';
    }

    exists ({OBJECT}) {
        return !!this.service.resolve(OBJECT);
    }
}

module.exports = AstroClasses;
