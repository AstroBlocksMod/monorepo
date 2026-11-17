// astro: Gradual type annotations. See astro/types.js for how they work.

const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const TypeService = require('../../astro/types');

const EXTENSION_ID = TypeService.EXTENSION_ID;

// Icon made for AstroBlocks: a name tag, as a type is written after a name.
const iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="20" fill="#0b8a7a"/>' +
    '<path d="M12 11h8l9.5 9.5-8 8L12 19z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="16.5" cy="15.5" r="2" fill="#0b8a7a"/></svg>';
const iconURI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSVG)}`;

/**
 * astro: Blocks for working with types, and the switch that makes annotations in names mean something.
 * Loading this extension into a project turns annotations on for that project.
 */
class AstroTypes {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.service = new TypeService(runtime);

        // An extension stays loaded when another project is opened, but whether annotations are on
        // belongs to the project. It is kept in the project's extension storage.
        runtime.on('RUNTIME_DISPOSED', () => {
            runtime.astroTypes = null;
        });
        runtime.on('PROJECT_LOADED', () => {
            if (TypeService.isOnIn(runtime.extensionStorage)) {
                this._turnOn();
            }
            this._refreshPalette();
        });

        // Adding the extension turns annotations on, unless the project being loaded says it had
        // turned them off and only uses the blocks.
        const stored = runtime.extensionStorage[EXTENSION_ID];
        if (!stored || stored.annotations !== false) {
            this._turnOn();
        }
    }

    _turnOn () {
        this.runtime.extensionStorage[EXTENSION_ID] = {annotations: true};
        if (this.runtime.astroTypes === this.service) return;
        this.runtime.astroTypes = this.service;
        this.service.applyToProject();
    }

    _turnOff () {
        this.runtime.extensionStorage[EXTENSION_ID] = {annotations: false};
        if (this.runtime.astroTypes !== this.service) return;
        this.runtime.astroTypes = null;
        this.service.releaseProject();
    }

    _refreshPalette () {
        // Not there when the runtime is used without a VM around it.
        const extensionManager = this.runtime.extensionManager;
        if (extensionManager && extensionManager.isExtensionLoaded(EXTENSION_ID)) {
            extensionManager.refreshBlocks(EXTENSION_ID);
        }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        const isOn = this.runtime.astroTypes === this.service;
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'astro_types.name',
                default: 'Types',
                description: 'Name of the extension that adds type annotations.'
            }),
            color1: '#0b8a7a',
            color2: '#097365',
            color3: '#075c51',
            menuIconURI: iconURI,
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: isOn ? formatMessage({
                        id: 'astro_types.labelOn',
                        default: 'Type annotations are on',
                        description: 'Label saying that names like "score: number" are being enforced.'
                    }) : formatMessage({
                        id: 'astro_types.labelOff',
                        default: 'Type annotations are off',
                        description: 'Label saying that names like "score: number" are not being enforced.'
                    })
                },
                {
                    blockType: BlockType.BUTTON,
                    func: 'toggleAnnotations',
                    text: isOn ? formatMessage({
                        id: 'astro_types.turnOff',
                        default: 'Turn Annotations Off',
                        description: 'Button that stops names like "score: number" from being enforced.'
                    }) : formatMessage({
                        id: 'astro_types.turnOn',
                        default: 'Turn Annotations On',
                        description: 'Button that makes names like "score: number" be enforced.'
                    })
                },
                '---',
                {
                    opcode: 'as',
                    text: formatMessage({
                        id: 'astro_types.blocks.as',
                        default: '[VALUE] as [TYPE]',
                        description: 'Block that converts a value to a type, like "abc as number".'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '12'
                        },
                        TYPE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'number',
                            menu: 'CONVERTIBLE_TYPE_MENU'
                        }
                    }
                },
                {
                    opcode: 'isA',
                    text: formatMessage({
                        id: 'astro_types.blocks.isA',
                        default: '[VALUE] is a [TYPE]?',
                        description: 'Block that checks whether a value is of a type, like "12 is a number?".'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '12'
                        },
                        TYPE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'number',
                            menu: 'TYPE_MENU'
                        }
                    }
                },
                {
                    opcode: 'typeOf',
                    text: formatMessage({
                        id: 'astro_types.blocks.typeOf',
                        default: 'type of [VALUE]',
                        description: 'Block that returns the name of the type of a value.'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '12'
                        }
                    }
                }
            ],
            menus: {
                // Types a value can be converted to. A value cannot be made into an instance of a class.
                CONVERTIBLE_TYPE_MENU: {
                    acceptReporters: false,
                    items: ['number', 'text', 'boolean']
                },
                TYPE_MENU: {
                    acceptReporters: true,
                    items: 'getTypeMenu'
                }
            }
        };
    }

    getTypeMenu () {
        return this.service.typeNames();
    }

    toggleAnnotations () {
        if (this.runtime.astroTypes === this.service) {
            this._turnOff();
        } else {
            this._turnOn();
        }
        this._refreshPalette();
        this.runtime.emitProjectChanged();
    }

    as ({VALUE, TYPE}) {
        // The block's menu only offers the built in types. Compiled scripts also use this block to
        // convert custom block inputs and return values to any other type (see convertInput()).
        const type = this.service.typeNamed(String(TYPE));
        return type ? type.coerce(VALUE) : VALUE;
    }

    isA ({VALUE, TYPE}) {
        const type = this.service.typeNamed(String(TYPE));
        return type ? type.accepts(VALUE) : false;
    }

    typeOf ({VALUE}) {
        return this.service.typeNameOf(VALUE);
    }
}

module.exports = AstroTypes;
