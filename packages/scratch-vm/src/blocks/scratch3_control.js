const Cast = require('../util/cast');
const {guardedFetch} = require('../util/tw-guarded-io');

class Scratch3ControlBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The "counter" block value. For compatibility with 2.0.
         * @type {number}
         */
        this._counter = 0; // used by compiler

        this.runtime.on('RUNTIME_DISPOSED', this.clearCounter.bind(this));
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            control_repeat: this.repeat,
            control_repeat_until: this.repeatUntil,
            control_while: this.repeatWhile,
            control_for_each: this.forEach,
            control_forever: this.forever,
            control_wait: this.wait,
            control_wait_until: this.waitUntil,
            control_if: this.if,
            control_if_else: this.ifElse,
            control_stop: this.stop,
            control_create_clone_of: this.createClone,
            control_delete_this_clone: this.deleteClone,
            control_get_counter: this.getCounter,
            control_incr_counter: this.incrCounter,
            control_clear_counter: this.clearCounter,
            control_all_at_once: this.allAtOnce,

            // Merged in from the Comment Blocks and "Utilities" extensions.
            control_clonecount: this.getCloneCount,
            control_isclone: this.isClone,
            control_comment_hat: this.comment,
            control_comment_statement: this.comment,
            control_comment_c: this.commentC,
            control_comment_reporter: this.commentValue,
            control_comment_boolean: this.commentBoolean,
            control_restartproject: this.restartProject,
            control_importproject: this.importProject,
            control_importsprite: this.importSprite,
            control_deletesprite: this.deleteSprite,
            control_seteditingtarget: this.setEditingTarget,
            control_loadextension: this.loadExtension
        };
    }

    getHats () {
        return {
            control_start_as_clone: {
                restartExistingThreads: false
            },
            control_comment_hat: {
                // A comment above a script must never start it.
                restartExistingThreads: false
            }
        };
    }

    repeat (args, util) {
        const times = Math.round(Cast.toNumber(args.TIMES));
        // Initialize loop
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = times;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            util.startBranch(1, true);
        }
    }

    repeatUntil (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        // If the condition is false (repeat UNTIL), start the branch.
        if (!condition) {
            util.startBranch(1, true);
        }
    }

    repeatWhile (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        // If the condition is true (repeat WHILE), start the branch.
        if (condition) {
            util.startBranch(1, true);
        }
    }

    forEach (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);

        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }

        if (util.stackFrame.index < Number(args.VALUE)) {
            util.stackFrame.index++;
            variable.value = util.stackFrame.index;
            util.startBranch(1, true);
        }
    }

    waitUntil (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (!condition) {
            util.yield();
        }
    }

    forever (args, util) {
        util.startBranch(1, true);
    }

    wait (args, util) {
        if (util.stackTimerNeedsInit()) {
            const duration = Math.max(0, 1000 * Cast.toNumber(args.DURATION));

            util.startStackTimer(duration);
            this.runtime.requestRedraw();
            util.yield();
        } else if (!util.stackTimerFinished()) {
            util.yield();
        }
    }

    if (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (condition) {
            util.startBranch(1, false);
        }
    }

    ifElse (args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (condition) {
            util.startBranch(1, false);
        } else {
            util.startBranch(2, false);
        }
    }

    stop (args, util) {
        const option = args.STOP_OPTION;
        if (option === 'all') {
            util.stopAll();
        } else if (option === 'other scripts in sprite' ||
            option === 'other scripts in stage') {
            util.stopOtherTargetThreads();
        } else if (option === 'this script') {
            util.stopThisScript();
        }
    }

    createClone (args, util) {
        this._createClone(Cast.toString(args.CLONE_OPTION), util.target);
    }
    _createClone (cloneOption, target) { // used by compiler
        // Set clone target
        let cloneTarget;
        if (cloneOption === '_myself_') {
            cloneTarget = target;
        } else {
            cloneTarget = this.runtime.getSpriteTargetByName(cloneOption);
        }

        // If clone target is not found, return
        if (!cloneTarget) return;

        // Create clone
        const newClone = cloneTarget.makeClone();
        if (newClone) {
            this.runtime.addTarget(newClone);

            // Place behind the original target.
            newClone.goBehindOther(cloneTarget);
        }
    }

    deleteClone (args, util) {
        if (util.target.isOriginal) return;
        this.runtime.disposeTarget(util.target);
        this.runtime.stopForTarget(util.target);
    }

    getCounter () {
        return this._counter;
    }

    clearCounter () {
        this._counter = 0;
    }

    incrCounter () {
        this._counter++;
    }

    getCloneCount () {
        return this.runtime._cloneCounter;
    }

    isClone (args, util) {
        return !util.target.isOriginal;
    }

    comment () {
        // Comments do nothing. `control_comment_hat` is never started by anything, and
        // `control_comment_statement` just falls through to the next block.
    }

    commentC (args, util) {
        util.startBranch(1, false);
    }

    commentValue (args) {
        return args.INPUT;
    }

    commentBoolean (args) {
        return Cast.toBoolean(args.INPUT);
    }

    restartProject () {
        this.runtime.greenFlag();
    }

    /**
     * Whether a block is running inside the editor rather than a standalone player.
     * Editor-only blocks confirm before doing something that would destroy the user's
     * work; in a player there is nothing to lose and a dialog would just be in the way.
     * The editor is the only thing that listens for workspace updates.
     * @returns {boolean} True if the project is open in an editor.
     * @private
     */
    _isEditor () {
        const vm = this.runtime.vm;
        return !!vm && vm.listenerCount('workspaceUpdate') > 0;
    }

    importProject (args) {
        const vm = this.runtime.vm;
        if (!vm) return;
        const url = Cast.toString(args.URL);
        // Ask first in the editor: this permanently destroys the open project.
        const message = `Import a project from "${url}"? Everything in the current project will be deleted.`;
        // eslint-disable-next-line no-alert
        if (this._isEditor() && !confirm(message)) {
            return;
        }
        return guardedFetch(this.runtime, url)
            .then(response => response.arrayBuffer())
            .then(buffer => vm.loadProject(buffer))
            .then(() => vm.greenFlag())
            .catch(() => {});
    }

    importSprite (args) {
        const vm = this.runtime.vm;
        if (!vm) return;
        return guardedFetch(this.runtime, Cast.toString(args.URL))
            .then(response => response.arrayBuffer())
            .then(buffer => vm.addSprite(buffer))
            .catch(() => {});
    }

    deleteSprite (args) {
        const vm = this.runtime.vm;
        if (!vm) return;
        const name = Cast.toString(args.SPRITE);
        const target = this.runtime.getSpriteTargetByName(name);
        if (!target || target.isStage) {
            return;
        }
        // eslint-disable-next-line no-alert
        if (this._isEditor() && !confirm(`Delete the sprite "${name}"? This cannot be undone.`)) {
            return;
        }
        vm.deleteSprite(target.id);
    }

    setEditingTarget (args) {
        const vm = this.runtime.vm;
        if (!vm) return;
        const name = Cast.toString(args.SPRITE);
        const target = name.toLowerCase() === 'stage' ?
            this.runtime.getTargetForStage() :
            this.runtime.getSpriteTargetByName(name);
        if (target) {
            vm.setEditingTarget(target.id);
        }
    }

    loadExtension (args) {
        const vm = this.runtime.vm;
        if (!vm) return;
        return vm.extensionManager.loadExtensionURL(Cast.toString(args.URL)).catch(() => {});
    }

    allAtOnce (args, util) {
        // Since the "all at once" block is implemented for compatiblity with
        // Scratch 2.0 projects, it behaves the same way it did in 2.0, which
        // is to simply run the contained script (like "if 1 = 1").
        // (In early versions of Scratch 2.0, it would work the same way as
        // "run without screen refresh" custom blocks do now, but this was
        // removed before the release of 2.0.)
        util.startBranch(1, false);
    }
}

module.exports = Scratch3ControlBlocks;
