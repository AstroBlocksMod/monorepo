/**
 * @fileoverview astro: Type annotations in the block editor.
 *
 * AstroBlocks lets a name end in a type: a variable called "score: number", a
 * custom block input called "label: text", a custom block called
 * "area of %s %s: number" for what it returns. scratch-vm enforces those when
 * a project runs (see scratch-vm/src/astro/types.js). This file is the editor's
 * half: a slot that has a type refuses a reporter that is known to give a
 * value of another type, the same way a hexagonal slot refuses a round block.
 *
 * Only dragging is checked. Blocks that are already connected stay connected
 * and a workspace always loads, whatever it holds, because the VM converts
 * values of the wrong type when the project runs.
 *
 * A reporter with no known type (a variable without an annotation, a block
 * from an extension) fits everywhere. That is what makes the typing gradual.
 */
'use strict';

/**
 * @name Blockly.AstroTypes
 * @namespace
 **/
goog.provide('Blockly.AstroTypes');

goog.require('Blockly.constants');


/**
 * Whether type annotations are on for the project being edited. The editor
 * replaces this with a function that asks the VM.
 * @return {boolean} True if slots should refuse reporters of another type.
 */
Blockly.AstroTypes.isEnabled = function() {
  return false;
};

/**
 * Type names as written in an annotation, mapped to the type they mean.
 * @type {!Object<string, string>}
 * @const
 */
Blockly.AstroTypes.TYPE_NAMES_ = {
  'number': 'number',
  'text': 'text',
  'string': 'text',
  'boolean': 'boolean'
};

/**
 * Reporters that always give a value of one type. Blocks that are not listed
 * and are not hexagonal are treated as dynamic.
 * @type {!Object<string, string>}
 * @const
 */
Blockly.AstroTypes.BLOCK_TYPES_ = {
  'operator_add': 'number',
  'operator_subtract': 'number',
  'operator_multiply': 'number',
  'operator_divide': 'number',
  'operator_random': 'number',
  'operator_mod': 'number',
  'operator_round': 'number',
  'operator_mathop': 'number',
  'operator_length': 'number',
  'motion_xposition': 'number',
  'motion_yposition': 'number',
  'motion_direction': 'number',
  'looks_size': 'number',
  'sound_volume': 'number',
  'sensing_timer': 'number',
  'sensing_mousex': 'number',
  'sensing_mousey': 'number',
  'sensing_distanceto': 'number',
  'sensing_dayssince2000': 'number',
  'sensing_loudness': 'number',
  'sensing_current': 'number',
  'data_lengthoflist': 'number',
  'data_itemnumoflist': 'number',
  'operator_join': 'text',
  'operator_letter_of': 'text',
  'sensing_answer': 'text',
  'sensing_username': 'text'
};

/**
 * Read the type at the end of a name.
 * @param {?string} name A name such as "score: number".
 * @return {?string} "number", "text" or "boolean", or null if the name has no
 *     type the editor knows.
 */
Blockly.AstroTypes.typeOfName = function(name) {
  if (typeof name != 'string') {
    return null;
  }
  var colon = name.lastIndexOf(':');
  if (colon < 1) {
    return null;
  }
  var typeName = name.slice(colon + 1).trim();
  if (!name.slice(0, colon).trim() ||
      !Object.prototype.hasOwnProperty.call(
          Blockly.AstroTypes.TYPE_NAMES_, typeName)) {
    return null;
  }
  return Blockly.AstroTypes.TYPE_NAMES_[typeName];
};

/**
 * Read the text of one of a block's fields.
 * @param {!Blockly.Block} block The block.
 * @param {string} fieldName Name of the field.
 * @return {?string} The field's text, or null if the block has no such field.
 * @private
 */
Blockly.AstroTypes.fieldText_ = function(block, fieldName) {
  var field = block.getField(fieldName);
  return field ? field.getText() : null;
};

/**
 * Work out the type of the value a reporter block gives.
 * @param {!Blockly.Block} block A reporter block.
 * @return {?string} "number", "text" or "boolean", or null if it is dynamic.
 */
Blockly.AstroTypes.outputType = function(block) {
  switch (block.type) {
    case 'data_variable':
      return Blockly.AstroTypes.typeOfName(
          Blockly.AstroTypes.fieldText_(block, 'VARIABLE'));
    case 'argument_reporter_string_number':
      return Blockly.AstroTypes.typeOfName(
          Blockly.AstroTypes.fieldText_(block, 'VALUE'));
    case 'argument_reporter_boolean':
      return Blockly.AstroTypes.typeOfName(
          Blockly.AstroTypes.fieldText_(block, 'VALUE')) || 'boolean';
    case Blockly.PROCEDURES_CALL_BLOCK_TYPE:
      return block.getProcCode ?
          Blockly.AstroTypes.typeOfName(block.getProcCode()) : null;
    case 'astroTypes_as':
      return Blockly.AstroTypes.typeOfName(
          'value: ' + Blockly.AstroTypes.fieldText_(block, 'TYPE'));
  }
  if (Object.prototype.hasOwnProperty.call(
      Blockly.AstroTypes.BLOCK_TYPES_, block.type)) {
    return Blockly.AstroTypes.BLOCK_TYPES_[block.type];
  }
  var check = block.outputConnection && block.outputConnection.check_;
  if (check && check.length == 1 && check[0] == 'Boolean') {
    return 'boolean';
  }
  return null;
};

/**
 * Find the name of the custom block input that a slot of a call block fills.
 * @param {!Blockly.Block} callBlock A procedures_call block.
 * @param {string} argumentId ID of the input, which is the name of the slot.
 * @return {?string} The input's name, or null if the custom block is not
 *     defined in this workspace.
 * @private
 */
Blockly.AstroTypes.argumentName_ = function(callBlock, argumentId) {
  var workspace = callBlock.workspace;
  if (workspace.isFlyout && workspace.targetWorkspace) {
    workspace = workspace.targetWorkspace;
  }
  var prototypeBlock = Blockly.Procedures.getPrototypeBlock(
      callBlock.getProcCode(), workspace);
  if (!prototypeBlock || !prototypeBlock.argumentIds_ ||
      !prototypeBlock.displayNames_) {
    return null;
  }
  var index = prototypeBlock.argumentIds_.indexOf(argumentId);
  return index == -1 ? null : prototypeBlock.displayNames_[index];
};

/**
 * Work out the type a slot wants.
 * @param {!Blockly.Connection} connection The input connection of the slot.
 * @return {?string} "number", "text" or "boolean", or null if it takes
 *     anything.
 */
Blockly.AstroTypes.expectedType = function(connection) {
  var block = connection.getSourceBlock();
  var inputName = null;
  for (var i = 0; i < block.inputList.length; i++) {
    if (block.inputList[i].connection == connection) {
      inputName = block.inputList[i].name;
      break;
    }
  }
  if (inputName === null) {
    return null;
  }
  switch (block.type) {
    case 'data_setvariableto':
      return inputName == 'VALUE' ? Blockly.AstroTypes.typeOfName(
          Blockly.AstroTypes.fieldText_(block, 'VARIABLE')) : null;
    case Blockly.PROCEDURES_CALL_BLOCK_TYPE:
      return block.getProcCode ? Blockly.AstroTypes.typeOfName(
          Blockly.AstroTypes.argumentName_(block, inputName)) : null;
    case 'procedures_return': {
      if (inputName != 'VALUE') {
        return null;
      }
      var root = block.getRootBlock();
      if (root.type != Blockly.PROCEDURES_DEFINITION_BLOCK_TYPE) {
        return null;
      }
      var prototypeInput = root.getInput('custom_block');
      var prototypeBlock = prototypeInput &&
          prototypeInput.connection.targetBlock();
      return prototypeBlock && prototypeBlock.getProcCode ?
          Blockly.AstroTypes.typeOfName(prototypeBlock.getProcCode()) : null;
    }
  }
  return null;
};

/**
 * Whether a value of one type can go where another is wanted.
 * Text takes numbers and booleans too, as every value has a text form.
 * @param {?string} actual The type of the value, or null if dynamic.
 * @param {?string} expected The type wanted, or null if anything goes.
 * @return {boolean} True if the value fits.
 */
Blockly.AstroTypes.isAssignable = function(actual, expected) {
  return !actual || !expected || actual == expected || expected == 'text';
};

/**
 * Whether a dragged block may be dropped on a connection, as far as types go.
 * @param {!Blockly.Connection} dragged A connection of the block being dragged.
 * @param {!Blockly.Connection} candidate The connection it would attach to.
 * @return {boolean} False if the drop would put a reporter of one type into a
 *     slot of another.
 */
Blockly.AstroTypes.allowsDrop = function(dragged, candidate) {
  if (dragged.type != Blockly.OUTPUT_VALUE ||
      candidate.type != Blockly.INPUT_VALUE ||
      !Blockly.AstroTypes.isEnabled()) {
    return true;
  }
  var expected = Blockly.AstroTypes.expectedType(candidate);
  if (!expected) {
    return true;
  }
  return Blockly.AstroTypes.isAssignable(
      Blockly.AstroTypes.outputType(dragged.getSourceBlock()), expected);
};
