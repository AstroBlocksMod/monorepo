/**
 * @fileoverview
 * A one block extension, "log [VALUE]", that hands a test whatever a project passes to it.
 */

const BlockType = require('../../../src/extension-support/block-type');
const ArgumentType = require('../../../src/extension-support/argument-type');
const {block} = require('./project');

/**
 * Add the extension to a VM.
 * @param {VirtualMachine} vm The VM.
 * @returns {Array<*>} The array every logged value is pushed to.
 */
const addLogExtension = vm => {
    const logged = [];
    vm.extensionManager.addBuiltinExtension('astrolog', class LogExtension {
        getInfo () {
            return {
                id: 'astrolog',
                name: 'Astro Log',
                blocks: [
                    {
                        opcode: 'log',
                        blockType: BlockType.COMMAND,
                        text: 'log [VALUE]',
                        arguments: {VALUE: {type: ArgumentType.STRING}}
                    }
                ]
            };
        }
        log ({VALUE}) {
            logged.push(VALUE);
        }
    });
    return logged;
};

/**
 * @param {*} value A literal or a block.
 * @returns {object} A "log [VALUE]" block.
 */
const log = value => block('astrolog_log', {VALUE: value});

module.exports = {
    addLogExtension,
    log
};
