/**
 * @fileoverview astro: Tests for type annotations in the block editor.
 */
'use strict';

var astroTypesTest_workspace;
var astroTypesTest_savedBlocks;
var astroTypesTest_savedIsEnabled;

function astroTypesTest_setUp() {
  astroTypesTest_savedIsEnabled = Blockly.AstroTypes.isEnabled;
  Blockly.AstroTypes.isEnabled = function() {
    return true;
  };

  // Stand-ins with the fields and inputs the real blocks have.
  var stubs = {
    'data_setvariableto': function() {
      this.appendValueInput('VALUE');
      this.appendDummyInput().appendField(new Blockly.FieldLabel(''), 'VARIABLE');
    },
    'data_changevariableby': function() {
      this.appendValueInput('VALUE');
      this.appendDummyInput().appendField(new Blockly.FieldLabel(''), 'VARIABLE');
    },
    'data_variable': function() {
      this.appendDummyInput().appendField(new Blockly.FieldLabel(''), 'VARIABLE');
      this.setOutput(true, 'String');
    },
    'argument_reporter_boolean': function() {
      this.appendDummyInput().appendField(new Blockly.FieldLabel(''), 'VALUE');
      this.setOutput(true, 'Boolean');
    },
    'operator_join': function() {
      this.setOutput(true, 'String');
    },
    'operator_add': function() {
      this.setOutput(true, 'Number');
    },
    'operator_equals': function() {
      this.setOutput(true, 'Boolean');
    },
    'some_extension_reporter': function() {
      this.setOutput(true, 'String');
    }
  };
  astroTypesTest_savedBlocks = {};
  for (var type in stubs) {
    astroTypesTest_savedBlocks[type] = Blockly.Blocks[type];
    Blockly.Blocks[type] = {init: stubs[type]};
  }
  astroTypesTest_workspace = new Blockly.Workspace();
}

function astroTypesTest_tearDown() {
  astroTypesTest_workspace.dispose();
  for (var type in astroTypesTest_savedBlocks) {
    if (astroTypesTest_savedBlocks[type]) {
      Blockly.Blocks[type] = astroTypesTest_savedBlocks[type];
    } else {
      delete Blockly.Blocks[type];
    }
  }
  Blockly.AstroTypes.isEnabled = astroTypesTest_savedIsEnabled;
}

/**
 * Make a block, with a name in its variable or input name field if it has one.
 * @param {string} type The block type.
 * @param {string=} opt_name Text for the VARIABLE or VALUE field.
 * @return {!Blockly.Block} The block.
 */
function astroTypesTest_block(type, opt_name) {
  var block = astroTypesTest_workspace.newBlock(type);
  var field = block.getField('VARIABLE') || block.getField('VALUE');
  if (field && opt_name) {
    field.setText(opt_name);
  }
  return block;
}

/**
 * Whether a reporter may be dropped into the VALUE slot of a block.
 * @param {!Blockly.Block} reporter The dragged reporter.
 * @param {!Blockly.Block} target The block with the slot.
 * @return {boolean} True if the drop is allowed.
 */
function astroTypesTest_allows(reporter, target) {
  return Blockly.AstroTypes.allowsDrop(
      reporter.outputConnection, target.getInput('VALUE').connection);
}

function test_astroTypes_typeOfName() {
  assertEquals('number', Blockly.AstroTypes.typeOfName('score: number'));
  assertEquals('number', Blockly.AstroTypes.typeOfName('score:number'));
  assertEquals('text', Blockly.AstroTypes.typeOfName('label: text'));
  assertEquals('text', Blockly.AstroTypes.typeOfName('label: string'));
  assertEquals('boolean', Blockly.AstroTypes.typeOfName('done: boolean'));
  assertEquals('number', Blockly.AstroTypes.typeOfName('area of %s %s: number'));
  assertNull(Blockly.AstroTypes.typeOfName('score'));
  assertNull(Blockly.AstroTypes.typeOfName('score: Enemy'));
  assertNull(Blockly.AstroTypes.typeOfName(': number'));
  assertNull(Blockly.AstroTypes.typeOfName('time: 12:30'));
  assertNull(Blockly.AstroTypes.typeOfName('score: constructor'));
  assertNull(Blockly.AstroTypes.typeOfName(null));
}

function test_astroTypes_isAssignable() {
  assertTrue(Blockly.AstroTypes.isAssignable('number', 'number'));
  assertTrue(Blockly.AstroTypes.isAssignable(null, 'number'));
  assertTrue(Blockly.AstroTypes.isAssignable('number', null));
  assertTrue(Blockly.AstroTypes.isAssignable('number', 'text'));
  assertTrue(Blockly.AstroTypes.isAssignable('boolean', 'text'));
  assertFalse(Blockly.AstroTypes.isAssignable('text', 'number'));
  assertFalse(Blockly.AstroTypes.isAssignable('boolean', 'number'));
  assertFalse(Blockly.AstroTypes.isAssignable('number', 'boolean'));
}

function test_astroTypes_typedVariableRefusesOtherTypes() {
  astroTypesTest_setUp();
  try {
    var setNumber = astroTypesTest_block('data_setvariableto', 'score: number');
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_add'), setNumber));
    assertFalse(astroTypesTest_allows(astroTypesTest_block('operator_join'), setNumber));
    assertFalse(astroTypesTest_allows(astroTypesTest_block('operator_equals'), setNumber));
    assertTrue(astroTypesTest_allows(
        astroTypesTest_block('data_variable', 'other: number'), setNumber));
    assertFalse(astroTypesTest_allows(
        astroTypesTest_block('data_variable', 'label: text'), setNumber));
    assertFalse(astroTypesTest_allows(
        astroTypesTest_block('argument_reporter_boolean', 'on'), setNumber));
  } finally {
    astroTypesTest_tearDown();
  }
}

function test_astroTypes_dynamicFitsEverywhere() {
  astroTypesTest_setUp();
  try {
    var setNumber = astroTypesTest_block('data_setvariableto', 'score: number');
    var setPlain = astroTypesTest_block('data_setvariableto', 'score');
    assertTrue(astroTypesTest_allows(
        astroTypesTest_block('data_variable', 'anything'), setNumber));
    assertTrue(astroTypesTest_allows(
        astroTypesTest_block('some_extension_reporter'), setNumber));
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_join'), setPlain));
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_equals'), setPlain));
  } finally {
    astroTypesTest_tearDown();
  }
}

function test_astroTypes_textTakesEverything() {
  astroTypesTest_setUp();
  try {
    var setText = astroTypesTest_block('data_setvariableto', 'label: text');
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_add'), setText));
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_join'), setText));
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_equals'), setText));
  } finally {
    astroTypesTest_tearDown();
  }
}

function test_astroTypes_onlyTypedSlotsAreChecked() {
  astroTypesTest_setUp();
  try {
    // "change by" takes a number whatever the variable is called, as it always has.
    var change = astroTypesTest_block('data_changevariableby', 'score: number');
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_join'), change));
  } finally {
    astroTypesTest_tearDown();
  }
}

function test_astroTypes_nothingIsRefusedWhenOff() {
  astroTypesTest_setUp();
  try {
    Blockly.AstroTypes.isEnabled = function() {
      return false;
    };
    var setNumber = astroTypesTest_block('data_setvariableto', 'score: number');
    assertTrue(astroTypesTest_allows(astroTypesTest_block('operator_join'), setNumber));
  } finally {
    astroTypesTest_tearDown();
  }
}
