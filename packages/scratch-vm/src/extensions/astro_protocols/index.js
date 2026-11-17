// astro: Protocols. See the protocol part of astro/objects.js for how they work.

const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const ObjectService = require('../../astro/objects');
const PaletteRefresher = require('../../astro/palette-refresher');

const EXTENSION_ID = 'astroProtocols';

// Icon made for AstroBlocks: a checklist, as a protocol is a list of what a sprite must have.
const iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="20" fill="#546e7a"/>' +
    '<g fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9.5 14.5l3 3 5-6"/><path d="M9.5 25.5l3 3 5-6"/></g>' +
    '<rect x="21" y="13" width="10" height="3" rx="1.5" fill="#fff"/>' +
    '<rect x="21" y="24" width="10" height="3" rx="1.5" fill="#fff"/></svg>';
const iconURI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSVG)}`;

/**
 * astro: Blocks that declare protocols and the sprites that conform to them.
 */
class AstroProtocols {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.service = ObjectService.for(runtime);

        // A protocol is about instances and calling their methods, which are the Classes
        // extension's blocks. A project that has one without the other could do nothing with it.
        const extensionManager = runtime.extensionManager;
        if (extensionManager && !extensionManager.isExtensionLoaded(ObjectService.EXTENSION_ID)) {
            extensionManager.loadExtensionIdSync(ObjectService.EXTENSION_ID);
        }

        // The palette lists what is wrong with the project's protocols, so it has to follow the project.
        this.palette = new PaletteRefresher(runtime, EXTENSION_ID, () => JSON.stringify(this._describeProblems()));
    }

    /**
     * @returns {Array<object>} Palette labels for each sprite that says it conforms to a protocol but
     * does not, saying what is missing.
     */
    _describeProblems () {
        const labels = [];
        const addLabel = text => labels.push({blockType: BlockType.LABEL, text});
        for (const problem of this.service.protocolProblems()) {
            if (problem.isUnknown) {
                addLabel(formatMessage({
                    id: 'astro_protocols.problemUnknown',
                    default: '{sprite}: there is no protocol called {protocol}',
                    description: 'Label for a sprite that says it conforms to a protocol that does not exist.'
                }, {sprite: problem.className, protocol: problem.protocolName}));
                continue;
            }
            addLabel(formatMessage({
                id: 'astro_protocols.problemMissing',
                default: '{sprite} does not conform to {protocol} yet. It needs:',
                description: 'Label above a list of the blocks and variables a sprite lacks to conform to a protocol.'
            }, {sprite: problem.className, protocol: problem.protocolName}));
            for (const missing of problem.missing) {
                addLabel(missing.kind === 'method' ? formatMessage({
                    id: 'astro_protocols.missingMethod',
                    default: 'the custom block "{block}"',
                    description: 'One custom block that a sprite lacks to conform to a protocol.'
                }, {block: ObjectService.readableProcedureCode(missing.name)}) : formatMessage({
                    id: 'astro_protocols.missingField',
                    default: 'the variable "{variable}"',
                    description: 'One variable that a sprite lacks to conform to a protocol.'
                }, {variable: missing.name}));
            }
        }
        return labels;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        const problems = this._describeProblems();
        this.palette.shown(JSON.stringify(problems));
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'astro_protocols.name',
                default: 'Protocols',
                description: 'Name of the extension that adds protocols.'
            }),
            color1: '#546e7a',
            color2: '#475d67',
            color3: '#3a4c54',
            menuIconURI: iconURI,
            blocks: [
                {
                    opcode: 'protocol',
                    text: formatMessage({
                        id: 'astro_protocols.blocks.protocol',
                        default: 'protocol',
                        description: 'Block that marks a sprite as a protocol.'
                    }),
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false
                },
                {
                    opcode: 'conformsTo',
                    text: formatMessage({
                        id: 'astro_protocols.blocks.conformsTo',
                        default: 'conforms to [PROTOCOL]',
                        description: 'Block with which a sprite says that it conforms to a protocol.'
                    }),
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        PROTOCOL: {
                            type: ArgumentType.STRING,
                            menu: 'PROTOCOL_MENU'
                        }
                    }
                },
                '---',
                {
                    opcode: 'conforms',
                    text: formatMessage({
                        id: 'astro_protocols.blocks.conforms',
                        default: '[OBJECT] conforms to [PROTOCOL]?',
                        description: 'Block that checks whether a value is an instance that conforms to a protocol.'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        OBJECT: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        },
                        PROTOCOL: {
                            type: ArgumentType.STRING,
                            menu: 'PROTOCOL_VALUE_MENU'
                        }
                    }
                }
            ].concat(problems.length > 0 ? ['---'] : [], problems),
            menus: {
                // On a block that declares something, the protocol is picked and cannot be computed.
                PROTOCOL_MENU: {
                    acceptReporters: false,
                    items: 'getProtocolMenu'
                },
                PROTOCOL_VALUE_MENU: {
                    acceptReporters: true,
                    items: 'getProtocolMenu'
                }
            }
        };
    }

    getProtocolMenu () {
        const names = this.service.protocols().map(sprite => sprite.name);
        return names.length > 0 ? names : [''];
    }

    conforms ({OBJECT, PROTOCOL}) {
        const reference = this.service.resolve(OBJECT);
        const protocol = this.service.classNamed(Cast.toString(PROTOCOL));
        return !!reference && !!protocol && this.service.conformsTo(reference.target.sprite, protocol);
    }
}

module.exports = AstroProtocols;
