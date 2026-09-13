const Cast = require('../util/cast');

class Scratch3DataBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * Values for the merged-in blocks that name their variable at runtime instead of
         * using a variable field. These are not saved with the project.
         * @type {object.<string, *>}
         */
        this._dynamicVariables = Object.create(null);

        this.runtime.on('RUNTIME_DISPOSED', this.deleteAllDynamicVars.bind(this));
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            data_variable: this.getVariable,
            data_setvariableto: this.setVariableTo,
            data_changevariableby: this.changeVariableBy,
            data_hidevariable: this.hideVariable,
            data_showvariable: this.showVariable,
            data_listcontents: this.getListContents,
            data_addtolist: this.addToList,
            data_deleteoflist: this.deleteOfList,
            data_deletealloflist: this.deleteAllOfList,
            data_insertatlist: this.insertAtList,
            data_replaceitemoflist: this.replaceItemOfList,
            data_itemoflist: this.getItemOfList,
            data_itemnumoflist: this.getItemNumOfList,
            data_lengthoflist: this.lengthOfList,
            data_listcontainsitem: this.listContainsItem,
            data_hidelist: this.hideList,
            data_showlist: this.showList,

            // Merged in from the List Tools and Lily's Toolbox extensions.
            data_deleteitemsoflist: this.deleteItemsOfList,
            data_deleteallofitemlist: this.deleteAllOfItemList,
            data_replaceallofitemlist: this.replaceAllOfItemList,
            data_listjoinedby: this.listJoinedBy,
            data_timesitemappears: this.timesItemAppears,
            data_itemindexoflist: this.itemIndexOfList,
            data_listisempty: this.listIsEmpty,
            data_itemnumexists: this.itemNumExists,
            data_listorderis: this.listOrderIs,
            data_setlistorder: this.setListOrder,
            data_setlisttolist: this.setListToList,
            data_concatlists: this.concatLists,
            data_repeatlist: this.repeatList,
            data_foreachitem: this.forEachItem,
            data_foreachitemnum: this.forEachItemNum,
            data_setlisttoarray: this.setListToArray,
            data_listasarray: this.listAsArray,
            data_setdynamicvar: this.setDynamicVar,
            data_changedynamicvar: this.changeDynamicVar,
            data_dynamicvar: this.getDynamicVar,
            data_deletedynamicvar: this.deleteDynamicVar,
            data_deletealldynamicvars: this.deleteAllDynamicVars,
            data_listdynamicvars: this.listDynamicVars
        };
    }

    /**
     * Look up the list a block's LIST argument refers to.
     * @param {object} listArg The block's `{id, name}` list argument.
     * @param {!object} util Block utility object.
     * @returns {!Variable} The list.
     * @private
     */
    _lookupList (listArg, util) {
        return util.target.lookupOrCreateList(listArg.id, listArg.name);
    }

    /**
     * Whether every item of an array is a value a Scratch list is allowed to hold.
     * @param {*} array The parsed JSON value.
     * @returns {boolean} True if the array can be used as a list's contents.
     * @private
     */
    static _isValidListContents (array) {
        return Array.isArray(array) && array.every(item => {
            const type = typeof item;
            return type === 'string' || type === 'number' || type === 'boolean';
        });
    }

    deleteItemsOfList (args, util) {
        const list = this._lookupList(args.LIST, util);
        const first = Cast.toListIndex(args.INDEX1, list.value.length, false);
        const last = Cast.toListIndex(args.INDEX2, list.value.length, false);
        if (first === Cast.LIST_INVALID || last === Cast.LIST_INVALID || last < first) {
            return;
        }
        list.value.splice(first - 1, (last - first) + 1);
        list._monitorUpToDate = false;
    }

    deleteAllOfItemList (args, util) {
        const list = this._lookupList(args.LIST, util);
        const item = args.ITEM;
        // Cast.compare so that Scratch considers the string '123' equal to the number 123,
        // matching `item # of` and `list contains`.
        const kept = list.value.filter(value => Cast.compare(value, item) !== 0);
        if (kept.length === list.value.length) {
            return;
        }
        list.value = kept;
        list._monitorUpToDate = false;
    }

    replaceAllOfItemList (args, util) {
        const list = this._lookupList(args.LIST, util);
        let changed = false;
        list.value = list.value.map(value => {
            if (Cast.compare(value, args.ITEM) === 0) {
                changed = true;
                return args.REPLACE;
            }
            return value;
        });
        if (changed) {
            list._monitorUpToDate = false;
        }
    }

    listJoinedBy (args, util) {
        return this._lookupList(args.LIST, util).value.join(Cast.toString(args.SEPARATOR));
    }

    timesItemAppears (args, util) {
        return this._lookupList(args.LIST, util).value
            .filter(value => Cast.compare(value, args.ITEM) === 0).length;
    }

    itemIndexOfList (args, util) {
        const list = this._lookupList(args.LIST, util);
        const matches = [];
        for (let i = 0; i < list.value.length; i++) {
            if (Cast.compare(list.value[i], args.ITEM) === 0) {
                matches.push(i + 1);
            }
        }
        const index = Cast.toListIndex(args.INDEX, matches.length, false);
        if (index === Cast.LIST_INVALID) {
            return 0;
        }
        return matches[index - 1];
    }

    listIsEmpty (args, util) {
        return this._lookupList(args.LIST, util).value.length === 0;
    }

    itemNumExists (args, util) {
        const list = this._lookupList(args.LIST, util);
        return Cast.toListIndex(args.INDEX, list.value.length, false) !== Cast.LIST_INVALID;
    }

    listOrderIs (args, util) {
        const list = this._lookupList(args.LIST, util);
        const descending = Cast.toString(args.ORDER) === 'descending';
        for (let i = 0; i < list.value.length - 1; i++) {
            const comparison = Cast.compare(list.value[i + 1], list.value[i]);
            if (descending ? comparison > 0 : comparison < 0) {
                return false;
            }
        }
        return true;
    }

    setListOrder (args, util) {
        const list = this._lookupList(args.LIST, util);
        switch (Cast.toString(args.ORDER)) {
        case 'reversed':
            list.value.reverse();
            break;
        case 'ascending':
            list.value.sort(Cast.compare);
            break;
        case 'descending':
            list.value.sort(Cast.compare).reverse();
            break;
        case 'randomised':
            for (let i = list.value.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const swap = list.value[i];
                list.value[i] = list.value[j];
                list.value[j] = swap;
            }
            break;
        default:
            return;
        }
        list._monitorUpToDate = false;
    }

    setListToList (args, util) {
        const target = this._lookupList(args.LIST1, util);
        const source = this._lookupList(args.LIST2, util);
        target.value = source.value.slice();
        target._monitorUpToDate = false;
    }

    concatLists (args, util) {
        const source = this._lookupList(args.LIST1, util);
        const target = this._lookupList(args.LIST2, util);
        target.value = target.value.concat(source.value);
        target._monitorUpToDate = false;
    }

    repeatList (args, util) {
        const source = this._lookupList(args.LIST1, util);
        const target = this._lookupList(args.LIST2, util);
        const times = Math.floor(Cast.toNumber(args.TIMES));
        if (times <= 0 || !Number.isFinite(times)) {
            return;
        }
        const contents = source.value.slice();
        for (let i = 0; i < times; i++) {
            target.value = target.value.concat(contents);
        }
        target._monitorUpToDate = false;
    }

    forEachItem (args, util) {
        const list = this._lookupList(args.LIST, util);
        const variable = util.target.lookupOrCreateVariable(args.VARIABLE.id, args.VARIABLE.name);
        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }
        if (util.stackFrame.index < list.value.length) {
            variable.value = list.value[util.stackFrame.index];
            util.stackFrame.index++;
            util.startBranch(1, true);
        }
    }

    forEachItemNum (args, util) {
        const list = this._lookupList(args.LIST, util);
        const variable = util.target.lookupOrCreateVariable(args.VARIABLE.id, args.VARIABLE.name);
        if (typeof util.stackFrame.index === 'undefined') {
            util.stackFrame.index = 0;
        }
        if (util.stackFrame.index < list.value.length) {
            util.stackFrame.index++;
            variable.value = util.stackFrame.index;
            util.startBranch(1, true);
        }
    }

    setListToArray (args, util) {
        let parsed;
        try {
            parsed = JSON.parse(Cast.toString(args.ARRAY));
        } catch (e) {
            return;
        }
        if (!Scratch3DataBlocks._isValidListContents(parsed)) {
            return;
        }
        const list = this._lookupList(args.LIST, util);
        list.value = parsed;
        list._monitorUpToDate = false;
    }

    listAsArray (args, util) {
        return JSON.stringify(this._lookupList(args.LIST, util).value);
    }

    setDynamicVar (args) {
        this._dynamicVariables[Cast.toString(args.NAME)] = args.VALUE;
    }

    changeDynamicVar (args) {
        const name = Cast.toString(args.NAME);
        const previous = Cast.toNumber(this._dynamicVariables[name]);
        this._dynamicVariables[name] = previous + Cast.toNumber(args.VALUE);
    }

    getDynamicVar (args) {
        const name = Cast.toString(args.NAME);
        if (name in this._dynamicVariables) {
            return this._dynamicVariables[name];
        }
        return '';
    }

    deleteDynamicVar (args) {
        delete this._dynamicVariables[Cast.toString(args.NAME)];
    }

    deleteAllDynamicVars () {
        this._dynamicVariables = Object.create(null);
    }

    listDynamicVars () {
        return JSON.stringify(Object.keys(this._dynamicVariables));
    }

    getVariable (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        return variable.value;
    }

    setVariableTo (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        variable.value = args.VALUE;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, args.VALUE]);
        }
    }

    changeVariableBy (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        const castedValue = Cast.toNumber(variable.value);
        const dValue = Cast.toNumber(args.VALUE);
        const newValue = castedValue + dValue;
        variable.value = newValue;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, newValue]);
        }
    }

    changeMonitorVisibility (id, visible) {
        // Send the monitor blocks an event like the flyout checkbox event.
        // This both updates the monitor state and changes the isMonitored block flag.
        this.runtime.monitorBlocks.changeBlock({
            id: id, // Monitor blocks for variables are the variable ID.
            element: 'checkbox', // Mimic checkbox event from flyout.
            value: visible
        }, this.runtime);
    }

    showVariable (args) {
        this.changeMonitorVisibility(args.VARIABLE.id, true);
    }

    hideVariable (args) {
        this.changeMonitorVisibility(args.VARIABLE.id, false);
    }

    showList (args) {
        this.changeMonitorVisibility(args.LIST.id, true);
    }

    hideList (args) {
        this.changeMonitorVisibility(args.LIST.id, false);
    }

    getListContents (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // If block is running for monitors, return copy of list as an array if changed.
        if (util.thread.updateMonitor) {
            // Return original list value if up-to-date, which doesn't trigger monitor update.
            if (list._monitorUpToDate) return list.value;
            // If value changed, reset the flag and return a copy to trigger monitor update.
            // MonitorState only detects updates when the object changes.
            list._monitorUpToDate = true;
            return list.value.slice();
        }

        // Determine if the list is all single letters.
        // If it is, report contents joined together with no separator.
        // If it's not, report contents joined together with a space.
        let allSingleLetters = true;
        for (let i = 0; i < list.value.length; i++) {
            const listItem = list.value[i];
            if (!((typeof listItem === 'string') &&
                  (listItem.length === 1))) {
                allSingleLetters = false;
                break;
            }
        }
        if (allSingleLetters) {
            return list.value.join('');
        }
        return list.value.join(' ');

    }

    addToList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        list.value.push(args.ITEM);
        list._monitorUpToDate = false;
    }

    deleteOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, true);
        if (index === Cast.LIST_INVALID) {
            return;
        } else if (index === Cast.LIST_ALL) {
            list.value = [];
            return;
        }
        list.value.splice(index - 1, 1);
        list._monitorUpToDate = false;
    }

    deleteAllOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        list.value = [];
        return;
    }

    insertAtList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length + 1, false);
        if (index === Cast.LIST_INVALID) {
            return;
        }
        list.value.splice(index - 1, 0, item);
        list._monitorUpToDate = false;
    }

    replaceItemOfList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (index === Cast.LIST_INVALID) {
            return;
        }
        list.value[index - 1] = item;
        list._monitorUpToDate = false;
    }

    getItemOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (index === Cast.LIST_INVALID) {
            return '';
        }
        return list.value[index - 1];
    }

    getItemNumOfList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // Go through the list items one-by-one using Cast.compare. This is for
        // cases like checking if 123 is contained in a list [4, 7, '123'] --
        // Scratch considers 123 and '123' to be equal.
        for (let i = 0; i < list.value.length; i++) {
            if (Cast.compare(list.value[i], item) === 0) {
                return i + 1;
            }
        }

        // We don't bother using .indexOf() at all, because it would end up with
        // edge cases such as the index of '123' in [4, 7, 123, '123', 9].
        // If we use indexOf(), this block would return 4 instead of 3, because
        // indexOf() sees the first occurence of the string 123 as the fourth
        // item in the list. With Scratch, this would be confusing -- after all,
        // '123' and 123 look the same, so one would expect the block to say
        // that the first occurrence of '123' (or 123) to be the third item.

        // Default to 0 if there's no match. Since Scratch lists are 1-indexed,
        // we don't have to worry about this conflicting with the "this item is
        // the first value" number (in JS that is 0, but in Scratch it's 1).
        return 0;
    }

    lengthOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return list.value.length;
    }

    listContainsItem (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (list.value.indexOf(item) >= 0) {
            return true;
        }
        // Try using Scratch comparison operator on each item.
        // (Scratch considers the string '123' equal to the number 123).
        for (let i = 0; i < list.value.length; i++) {
            if (Cast.compare(list.value[i], item) === 0) {
                return true;
            }
        }
        return false;
    }
}

module.exports = Scratch3DataBlocks;
