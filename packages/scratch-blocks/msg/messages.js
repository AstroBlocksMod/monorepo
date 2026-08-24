/**
 * @license
 * Visual Blocks Language
 *
 * Copyright 2012 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview English strings.
 * @author ascii@media.mit.edu (Andrew Sliwinski)
 *
 * After modifying this file, run `npm run translate` from the root directory
 * to regenerate `./msg/json/en.json`.
 * IMPORTANT:
 * All message strings must use single quotes for the scripts to work properly
 */
'use strict';

goog.provide('Blockly.Msg.en');

goog.require('Blockly.Msg');

// Control blocks
Blockly.Msg.CONTROL_FOREVER = 'forever';
Blockly.Msg.CONTROL_REPEAT = 'repeat %1';
Blockly.Msg.CONTROL_IF = 'if %1 then';
Blockly.Msg.CONTROL_ELSE = 'else';
Blockly.Msg.CONTROL_STOP = 'stop';
Blockly.Msg.CONTROL_STOP_ALL = 'all';
Blockly.Msg.CONTROL_STOP_THIS = 'this script';
Blockly.Msg.CONTROL_STOP_OTHER = 'other scripts in sprite';
Blockly.Msg.CONTROL_WAIT = 'wait %1 seconds';
Blockly.Msg.CONTROL_WAITUNTIL = 'wait until %1';
Blockly.Msg.CONTROL_REPEATUNTIL = 'repeat until %1';
Blockly.Msg.CONTROL_WHILE = 'while %1';
Blockly.Msg.CONTROL_FOREACH = 'for each %1 in %2';
Blockly.Msg.CONTROL_STARTASCLONE = 'when I start as a clone';
Blockly.Msg.CONTROL_CREATECLONEOF = 'create clone of %1';
Blockly.Msg.CONTROL_CREATECLONEOF_MYSELF = 'myself';
Blockly.Msg.CONTROL_DELETETHISCLONE = 'delete this clone';
Blockly.Msg.CONTROL_COUNTER = 'counter';
Blockly.Msg.CONTROL_INCRCOUNTER = 'increment counter';
Blockly.Msg.CONTROL_CLEARCOUNTER = 'clear counter';
Blockly.Msg.CONTROL_ALLATONCE = 'all at once';

// Merged extension blocks: Control
Blockly.Msg.CONTROL_CLONECOUNT = 'clone count';
Blockly.Msg.CONTROL_ISCLONE = 'is clone?';
Blockly.Msg.CONTROL_COMMENT = '// %1';
Blockly.Msg.CONTROL_COMMENT_DEFAULT = 'comment';
Blockly.Msg.CONTROL_COMMENT_VALUE = '%1 // %2';
Blockly.Msg.CONTROL_RESTARTPROJECT = 'restart project';
Blockly.Msg.CONTROL_IMPORTPROJECT = 'import project from URL %1';
Blockly.Msg.CONTROL_IMPORTSPRITE = 'import sprite from URL %1';
Blockly.Msg.CONTROL_DELETESPRITE = 'delete sprite %1';
Blockly.Msg.CONTROL_SETEDITINGTARGET = 'set editing target to %1';
Blockly.Msg.CONTROL_LOADEXTENSION = 'load extension from URL %1';

// Data blocks
Blockly.Msg.DATA_SETVARIABLETO = 'set %1 to %2';
Blockly.Msg.DATA_CHANGEVARIABLEBY = 'change %1 by %2';
Blockly.Msg.DATA_SHOWVARIABLE = 'show variable %1';
Blockly.Msg.DATA_HIDEVARIABLE = 'hide variable %1';
Blockly.Msg.DATA_ADDTOLIST = 'add %1 to %2';
Blockly.Msg.DATA_DELETEOFLIST = 'delete %1 of %2';
Blockly.Msg.DATA_DELETEALLOFLIST = 'delete all of %1';
Blockly.Msg.DATA_INSERTATLIST = 'insert %1 at %2 of %3';
Blockly.Msg.DATA_REPLACEITEMOFLIST = 'replace item %1 of %2 with %3';
Blockly.Msg.DATA_ITEMOFLIST = 'item %1 of %2';
Blockly.Msg.DATA_ITEMNUMOFLIST = 'item # of %1 in %2';
Blockly.Msg.DATA_LENGTHOFLIST = 'length of %1';
Blockly.Msg.DATA_LISTCONTAINSITEM = '%1 contains %2?';
Blockly.Msg.DATA_SHOWLIST = 'show list %1';
Blockly.Msg.DATA_HIDELIST = 'hide list %1';
Blockly.Msg.DATA_INDEX_ALL = 'all';
Blockly.Msg.DATA_INDEX_LAST = 'last';
Blockly.Msg.DATA_INDEX_RANDOM = 'random';

// Merged extension blocks: Data
Blockly.Msg.DATA_DELETEITEMSOFLIST = 'delete items %1 to %2 of %3';
Blockly.Msg.DATA_DELETEALLOFITEMLIST = 'delete all %1 in %2';
Blockly.Msg.DATA_REPLACEALLOFITEMLIST = 'replace all %1 with %2 in %3';
Blockly.Msg.DATA_LISTJOINEDBY = '%1 joined by %2';
Blockly.Msg.DATA_TIMESITEMAPPEARS = '# of times %1 appears in %2';
Blockly.Msg.DATA_ITEMINDEXOFLIST = 'index # %1 of item %2 in %3';
Blockly.Msg.DATA_LISTISEMPTY = '%1 is empty?';
Blockly.Msg.DATA_ITEMNUMEXISTS = 'item %1 exists in %2?';
Blockly.Msg.DATA_LISTORDERIS = 'order of %1 is %2?';
Blockly.Msg.DATA_SETLISTORDER = 'set order of %1 to %2';
Blockly.Msg.DATA_ORDER_REVERSED = 'reversed';
Blockly.Msg.DATA_ORDER_ASCENDING = 'ascending';
Blockly.Msg.DATA_ORDER_DESCENDING = 'descending';
Blockly.Msg.DATA_ORDER_RANDOMISED = 'randomized';
Blockly.Msg.DATA_SETLISTTOLIST = 'set items of %1 to %2';
Blockly.Msg.DATA_CONCATLISTS = 'concatenate %1 onto %2';
Blockly.Msg.DATA_REPEATLIST = 'repeat %1 %2 times in %3';
Blockly.Msg.DATA_FOREACHITEM = 'for each item value %1 in %2';
Blockly.Msg.DATA_FOREACHITEMNUM = 'for each item # %1 in %2';
Blockly.Msg.DATA_SETLISTTOARRAY = 'set %1 to array %2';
Blockly.Msg.DATA_LISTASARRAY = '%1 as array';
Blockly.Msg.DATA_SETDYNAMICVAR = 'set dynamic variable %1 to %2';
Blockly.Msg.DATA_CHANGEDYNAMICVAR = 'change dynamic variable %1 by %2';
Blockly.Msg.DATA_DYNAMICVAR = 'dynamic variable %1';
Blockly.Msg.DATA_DELETEDYNAMICVAR = 'delete dynamic variable %1';
Blockly.Msg.DATA_DELETEALLDYNAMICVARS = 'delete all dynamic variables';
Blockly.Msg.DATA_LISTDYNAMICVARS = 'all dynamic variables';

// Event blocks
Blockly.Msg.EVENT_WHENFLAGCLICKED = 'when %1 clicked';
Blockly.Msg.EVENT_WHENTHISSPRITECLICKED = 'when this sprite clicked';
Blockly.Msg.EVENT_WHENSTAGECLICKED = 'when stage clicked';
Blockly.Msg.EVENT_WHENTOUCHINGOBJECT = 'when this sprite touches %1';
Blockly.Msg.EVENT_WHENBROADCASTRECEIVED = 'when I receive %1';
Blockly.Msg.EVENT_WHENBACKDROPSWITCHESTO = 'when backdrop switches to %1';
Blockly.Msg.EVENT_WHENGREATERTHAN = 'when %1 > %2';
Blockly.Msg.EVENT_WHENGREATERTHAN_TIMER = 'timer';
Blockly.Msg.EVENT_WHENGREATERTHAN_LOUDNESS = 'loudness';
Blockly.Msg.EVENT_BROADCAST = 'broadcast %1';
Blockly.Msg.EVENT_BROADCASTANDWAIT = 'broadcast %1 and wait';
Blockly.Msg.EVENT_WHENKEYPRESSED = 'when %1 key pressed';
Blockly.Msg.EVENT_WHENKEYPRESSED_SPACE = 'space';
Blockly.Msg.EVENT_WHENKEYPRESSED_LEFT = 'left arrow';
Blockly.Msg.EVENT_WHENKEYPRESSED_RIGHT = 'right arrow';
Blockly.Msg.EVENT_WHENKEYPRESSED_DOWN = 'down arrow';
Blockly.Msg.EVENT_WHENKEYPRESSED_UP = 'up arrow';
Blockly.Msg.EVENT_WHENKEYPRESSED_ANY = 'any';

// Merged extension blocks: Event
Blockly.Msg.EVENT_WHENBOOLEAN = 'when %1 is true';
Blockly.Msg.EVENT_WHENKEYPRESSEDNAMED = 'when key %1 pressed';

// Looks blocks
Blockly.Msg.LOOKS_SAYFORSECS = 'say %1 for %2 seconds';
Blockly.Msg.LOOKS_SAY = 'say %1';
Blockly.Msg.LOOKS_HELLO = 'Hello!';
Blockly.Msg.LOOKS_THINKFORSECS = 'think %1 for %2 seconds';
Blockly.Msg.LOOKS_THINK = 'think %1';
Blockly.Msg.LOOKS_HMM = 'Hmm...';
Blockly.Msg.LOOKS_SHOW = 'show';
Blockly.Msg.LOOKS_HIDE = 'hide';
Blockly.Msg.LOOKS_HIDEALLSPRITES = 'hide all sprites';
Blockly.Msg.LOOKS_EFFECT_COLOR = 'color';
Blockly.Msg.LOOKS_EFFECT_FISHEYE = 'fisheye';
Blockly.Msg.LOOKS_EFFECT_WHIRL = 'whirl';
Blockly.Msg.LOOKS_EFFECT_PIXELATE = 'pixelate';
Blockly.Msg.LOOKS_EFFECT_MOSAIC = 'mosaic';
Blockly.Msg.LOOKS_EFFECT_BRIGHTNESS = 'brightness';
Blockly.Msg.LOOKS_EFFECT_GHOST = 'ghost';
Blockly.Msg.LOOKS_CHANGEEFFECTBY = 'change %1 effect by %2';
Blockly.Msg.LOOKS_SETEFFECTTO = 'set %1 effect to %2';
Blockly.Msg.LOOKS_CLEARGRAPHICEFFECTS = 'clear graphic effects';
Blockly.Msg.LOOKS_CHANGESIZEBY = 'change size by %1';
Blockly.Msg.LOOKS_SETSIZETO = 'set size to %1 %';
Blockly.Msg.LOOKS_SIZE = 'size';
Blockly.Msg.LOOKS_CHANGESTRETCHBY = 'change stretch by %1';
Blockly.Msg.LOOKS_SETSTRETCHTO = 'set stretch to %1 %';
Blockly.Msg.LOOKS_SWITCHCOSTUMETO = 'switch costume to %1';
Blockly.Msg.LOOKS_NEXTCOSTUME = 'next costume';
Blockly.Msg.LOOKS_SWITCHBACKDROPTO = 'switch backdrop to %1';
Blockly.Msg.LOOKS_GOTOFRONTBACK = 'go to %1 layer';
Blockly.Msg.LOOKS_GOTOFRONTBACK_FRONT = 'front';
Blockly.Msg.LOOKS_GOTOFRONTBACK_BACK = 'back';
Blockly.Msg.LOOKS_GOFORWARDBACKWARDLAYERS = 'go %1 %2 layers';
Blockly.Msg.LOOKS_GOFORWARDBACKWARDLAYERS_FORWARD = 'forward';
Blockly.Msg.LOOKS_GOFORWARDBACKWARDLAYERS_BACKWARD = 'backward';
Blockly.Msg.LOOKS_BACKDROPNUMBERNAME = 'backdrop %1';
Blockly.Msg.LOOKS_COSTUMENUMBERNAME = 'costume %1';
Blockly.Msg.LOOKS_NUMBERNAME_NUMBER = 'number';
Blockly.Msg.LOOKS_NUMBERNAME_NAME = 'name';
Blockly.Msg.LOOKS_SWITCHBACKDROPTOANDWAIT = 'switch backdrop to %1 and wait';
Blockly.Msg.LOOKS_NEXTBACKDROP_BLOCK = 'next backdrop';
Blockly.Msg.LOOKS_NEXTBACKDROP = 'next backdrop';
Blockly.Msg.LOOKS_PREVIOUSBACKDROP = 'previous backdrop';
Blockly.Msg.LOOKS_RANDOMBACKDROP = 'random backdrop';

// Merged extension blocks: Looks
Blockly.Msg.LOOKS_EFFECTVALUE = '%1 effect';
Blockly.Msg.LOOKS_SETCOSTUMESVG = 'replace SVG data of costume %1 with %2';
Blockly.Msg.LOOKS_IMPORTCOSTUME = 'add costume from URL %1 named %2';
Blockly.Msg.LOOKS_DELETECOSTUME = 'delete costume %1 of sprite %2';

// Motion blocks
Blockly.Msg.MOTION_MOVESTEPS = 'move %1 steps';
Blockly.Msg.MOTION_TURNLEFT = 'turn %1 %2 degrees';
Blockly.Msg.MOTION_TURNRIGHT = 'turn %1 %2 degrees';
Blockly.Msg.MOTION_POINTINDIRECTION = 'point in direction %1';
Blockly.Msg.MOTION_POINTTOWARDS = 'point towards %1';
Blockly.Msg.MOTION_POINTTOWARDS_POINTER = 'mouse-pointer';
Blockly.Msg.MOTION_POINTTOWARDS_RANDOM = 'random direction';
Blockly.Msg.MOTION_GOTO = 'go to %1';
Blockly.Msg.MOTION_GOTO_POINTER = 'mouse-pointer';
Blockly.Msg.MOTION_GOTO_RANDOM = 'random position';
Blockly.Msg.MOTION_GOTOXY = 'go to x: %1 y: %2';
Blockly.Msg.MOTION_GLIDESECSTOXY = 'glide %1 secs to x: %2 y: %3';
Blockly.Msg.MOTION_GLIDETO = 'glide %1 secs to %2';
Blockly.Msg.MOTION_GLIDETO_POINTER = 'mouse-pointer';
Blockly.Msg.MOTION_GLIDETO_RANDOM = 'random position';
Blockly.Msg.MOTION_CHANGEXBY = 'change x by %1';
Blockly.Msg.MOTION_SETX = 'set x to %1';
Blockly.Msg.MOTION_CHANGEYBY = 'change y by %1';
Blockly.Msg.MOTION_SETY = 'set y to %1';
Blockly.Msg.MOTION_IFONEDGEBOUNCE = 'if on edge, bounce';
Blockly.Msg.MOTION_SETROTATIONSTYLE = 'set rotation style %1';
Blockly.Msg.MOTION_SETROTATIONSTYLE_LEFTRIGHT = 'left-right';
Blockly.Msg.MOTION_SETROTATIONSTYLE_DONTROTATE = 'don\'t rotate';
Blockly.Msg.MOTION_SETROTATIONSTYLE_ALLAROUND = 'all around';
Blockly.Msg.MOTION_XPOSITION = 'x position';
Blockly.Msg.MOTION_YPOSITION = 'y position';
Blockly.Msg.MOTION_DIRECTION = 'direction';
Blockly.Msg.MOTION_SCROLLRIGHT = 'scroll right %1';
Blockly.Msg.MOTION_SCROLLUP = 'scroll up %1';
Blockly.Msg.MOTION_ALIGNSCENE = 'align scene %1';
Blockly.Msg.MOTION_ALIGNSCENE_BOTTOMLEFT = 'bottom-left';
Blockly.Msg.MOTION_ALIGNSCENE_BOTTOMRIGHT = 'bottom-right';
Blockly.Msg.MOTION_ALIGNSCENE_MIDDLE = 'middle';
Blockly.Msg.MOTION_ALIGNSCENE_TOPLEFT = 'top-left';
Blockly.Msg.MOTION_ALIGNSCENE_TOPRIGHT = 'top-right';
Blockly.Msg.MOTION_XSCROLL = 'x scroll';
Blockly.Msg.MOTION_YSCROLL = 'y scroll';
Blockly.Msg.MOTION_STAGE_SELECTED = 'Stage selected: no motion blocks';

// Operators blocks
Blockly.Msg.OPERATORS_ADD = '%1 + %2';
Blockly.Msg.OPERATORS_SUBTRACT = '%1 - %2';
Blockly.Msg.OPERATORS_MULTIPLY = '%1 * %2';
Blockly.Msg.OPERATORS_DIVIDE = '%1 / %2';
Blockly.Msg.OPERATORS_RANDOM = 'pick random %1 to %2';
Blockly.Msg.OPERATORS_GT = '%1 > %2';
Blockly.Msg.OPERATORS_LT = '%1 < %2';
Blockly.Msg.OPERATORS_EQUALS = '%1 = %2';
Blockly.Msg.OPERATORS_AND = '%1 and %2';
Blockly.Msg.OPERATORS_OR = '%1 or %2';
Blockly.Msg.OPERATORS_NOT = 'not %1';
Blockly.Msg.OPERATORS_JOIN = 'join %1 %2';
Blockly.Msg.OPERATORS_JOIN_APPLE = 'apple';
Blockly.Msg.OPERATORS_JOIN_BANANA = 'banana';
Blockly.Msg.OPERATORS_LETTEROF = 'letter %1 of %2';
Blockly.Msg.OPERATORS_LETTEROF_APPLE = 'a';
Blockly.Msg.OPERATORS_LENGTH = 'length of %1';
Blockly.Msg.OPERATORS_CONTAINS = '%1 contains %2?';
Blockly.Msg.OPERATORS_MOD = '%1 mod %2';
Blockly.Msg.OPERATORS_ROUND = 'round %1';
Blockly.Msg.OPERATORS_MATHOP = '%1 of %2';
Blockly.Msg.OPERATORS_MATHOP_ABS = 'abs';
Blockly.Msg.OPERATORS_MATHOP_FLOOR = 'floor';
Blockly.Msg.OPERATORS_MATHOP_CEILING = 'ceiling';
Blockly.Msg.OPERATORS_MATHOP_SQRT = 'sqrt';
Blockly.Msg.OPERATORS_MATHOP_SIN = 'sin';
Blockly.Msg.OPERATORS_MATHOP_COS = 'cos';
Blockly.Msg.OPERATORS_MATHOP_TAN = 'tan';
Blockly.Msg.OPERATORS_MATHOP_ASIN = 'asin';
Blockly.Msg.OPERATORS_MATHOP_ACOS = 'acos';
Blockly.Msg.OPERATORS_MATHOP_ATAN = 'atan';
Blockly.Msg.OPERATORS_MATHOP_LN = 'ln';
Blockly.Msg.OPERATORS_MATHOP_LOG = 'log';
Blockly.Msg.OPERATORS_MATHOP_EEXP = 'e ^';
Blockly.Msg.OPERATORS_MATHOP_10EXP = '10 ^';

// Merged extension blocks: Operators (text)
Blockly.Msg.OPERATORS_LETTERSOF = 'letters %1 to %2 of %3';
Blockly.Msg.OPERATORS_SPLIT = 'item %1 of %2 split by %3';
Blockly.Msg.OPERATORS_COUNT = 'count %1 in %2';
Blockly.Msg.OPERATORS_INDEXOF = 'index of %1 in %2';
Blockly.Msg.OPERATORS_REPLACE = 'replace all %1 in %2 with %3';
Blockly.Msg.OPERATORS_REPLACEFIRST = 'replace first %1 in %2 with %3';
Blockly.Msg.OPERATORS_REPEATTEXT = 'repeat %1 %2 times';
Blockly.Msg.OPERATORS_REVERSE = 'reverse %1';
Blockly.Msg.OPERATORS_TRIM = 'trim whitespace %1 from %2';
Blockly.Msg.OPERATORS_TRIM_BOTH = 'both sides';
Blockly.Msg.OPERATORS_TRIM_START = 'the start';
Blockly.Msg.OPERATORS_TRIM_END = 'the end';
Blockly.Msg.OPERATORS_TOCASE = 'convert %1 to %2';
Blockly.Msg.OPERATORS_ISCASE = 'is %1 %2?';
Blockly.Msg.OPERATORS_CASE_LOWERCASE = 'lowercase';
Blockly.Msg.OPERATORS_CASE_UPPERCASE = 'UPPERCASE';
Blockly.Msg.OPERATORS_CASE_SENTENCECASE = 'Sentence case';
Blockly.Msg.OPERATORS_CASE_TITLECASE = 'Title Case';
Blockly.Msg.OPERATORS_CASE_EXACTTITLECASE = 'Exactly Title Case';
Blockly.Msg.OPERATORS_CASE_MIXEDCASE = 'MiXeD CaSe';
Blockly.Msg.OPERATORS_CASE_RANDOMCASE = 'RAndoMCaSe';
Blockly.Msg.OPERATORS_CASE_CAMELCASE = 'camelCase';
Blockly.Msg.OPERATORS_POSWITH = '%1 %2 with %3?';
Blockly.Msg.OPERATORS_POSWITH_STARTS = 'starts';
Blockly.Msg.OPERATORS_POSWITH_ENDS = 'ends';
Blockly.Msg.OPERATORS_IDENTICAL = 'is %1 identical to %2?';
Blockly.Msg.OPERATORS_UNICODEOF = 'unicode of %1';
Blockly.Msg.OPERATORS_UNICODEFROM = 'unicode %1 as letter';
Blockly.Msg.OPERATORS_NEWLINE = 'newline character';
Blockly.Msg.OPERATORS_ENCODE = 'encode %1 as %2';
Blockly.Msg.OPERATORS_DECODE = 'decode %1 from %2';
Blockly.Msg.OPERATORS_CODING_BASE64 = 'base64';
Blockly.Msg.OPERATORS_CODING_BINARY = 'binary';
Blockly.Msg.OPERATORS_CODING_URI = 'URI component';
Blockly.Msg.OPERATORS_STRINGTYPE = 'is %1 a %2?';
Blockly.Msg.OPERATORS_STRINGTYPE_NUMBER = 'number';
Blockly.Msg.OPERATORS_STRINGTYPE_TEXT = 'text';
Blockly.Msg.OPERATORS_REPLACEREGEX = 'replace regex /%1/%2 in %3 with %4';
Blockly.Msg.OPERATORS_MATCHREGEX = 'item %1 of %2 matched by regex /%3/%4';
Blockly.Msg.OPERATORS_MATCHREGEXALL = 'matches of %1 using regex /%2/%3 as array';
Blockly.Msg.OPERATORS_TESTREGEX = '%1 matches regex /%2/%3?';
Blockly.Msg.OPERATORS_COUNTREGEX = 'count regex /%1/%2 in %3';
Blockly.Msg.OPERATORS_PARSEJSON = '%1 of %2';

// Merged extension blocks: Operators (math and logic)
Blockly.Msg.OPERATORS_LE = '%1 \u2264 %2';
Blockly.Msg.OPERATORS_GE = '%1 \u2265 %2';
Blockly.Msg.OPERATORS_NOTEQUAL = '%1 \u2260 %2';
Blockly.Msg.OPERATORS_NAND = '%1 nand %2';
Blockly.Msg.OPERATORS_NOR = '%1 nor %2';
Blockly.Msg.OPERATORS_XOR = '%1 xor %2';
Blockly.Msg.OPERATORS_XNOR = '%1 xnor %2';
Blockly.Msg.OPERATORS_TRUE = 'true';
Blockly.Msg.OPERATORS_FALSE = 'false';
Blockly.Msg.OPERATORS_BOOLIFY = '%1 as boolean';
Blockly.Msg.OPERATORS_TERNARY = 'if %1 then %2 else %3';
Blockly.Msg.OPERATORS_EXPONENT = '%1 ^ %2';
Blockly.Msg.OPERATORS_ROOT = '%1 \u221a %2';
Blockly.Msg.OPERATORS_NEGATIVE = '- %1';
Blockly.Msg.OPERATORS_PI = 'pi';
Blockly.Msg.OPERATORS_CLAMP = 'clamp %1 between %2 and %3';
Blockly.Msg.OPERATORS_SIGN = 'sign of %1';
Blockly.Msg.OPERATORS_BRIGHTNESS = 'brightness of %1';

// Merged extension blocks: Operators (literal values)
Blockly.Msg.OPERATORS_STRINGVALUE = 'text %1';
Blockly.Msg.OPERATORS_COLOUR = 'color %1';
Blockly.Msg.OPERATORS_ANGLE = 'angle %1';
Blockly.Msg.OPERATORS_NOTEVALUE = 'note %1';
Blockly.Msg.OPERATORS_MATRIX = 'matrix %1';

// Procedures blocks
Blockly.Msg.PROCEDURES_DEFINITION = 'define %1';

// TW Procedures blocks
Blockly.Msg.PROCEDURES_RETURN = 'return %1';
Blockly.Msg.PROCEDURES_TO_REPORTER = 'Change To Reporter';
Blockly.Msg.PROCEDURES_TO_STATEMENT = 'Change To Stacked Block';
Blockly.Msg.PROCEDURES_DOCS = 'How to use return';

// Sensing blocks
Blockly.Msg.SENSING_TOUCHINGOBJECT = 'touching %1?';
Blockly.Msg.SENSING_TOUCHINGOBJECT_POINTER = 'mouse-pointer';
Blockly.Msg.SENSING_TOUCHINGOBJECT_EDGE = 'edge';
Blockly.Msg.SENSING_TOUCHINGCOLOR = 'touching color %1?';
Blockly.Msg.SENSING_COLORISTOUCHINGCOLOR = 'color %1 is touching %2?';
Blockly.Msg.SENSING_DISTANCETO = 'distance to %1';
Blockly.Msg.SENSING_DISTANCETO_POINTER = 'mouse-pointer';
Blockly.Msg.SENSING_ASKANDWAIT = 'ask %1 and wait';
Blockly.Msg.SENSING_ASK_TEXT = 'What\'s your name?';
Blockly.Msg.SENSING_ANSWER = 'answer';
Blockly.Msg.SENSING_KEYPRESSED = 'key %1 pressed?';
Blockly.Msg.SENSING_MOUSEDOWN = 'mouse down?';
Blockly.Msg.SENSING_MOUSEX = 'mouse x';
Blockly.Msg.SENSING_MOUSEY = 'mouse y';
Blockly.Msg.SENSING_SETDRAGMODE = 'set drag mode %1';
Blockly.Msg.SENSING_SETDRAGMODE_DRAGGABLE = 'draggable';
Blockly.Msg.SENSING_SETDRAGMODE_NOTDRAGGABLE = 'not draggable';
Blockly.Msg.SENSING_LOUDNESS = 'loudness';
Blockly.Msg.SENSING_LOUD = 'loud?';
Blockly.Msg.SENSING_TIMER = 'timer';
Blockly.Msg.SENSING_RESETTIMER = 'reset timer';
Blockly.Msg.SENSING_OF = '%1 of %2';
Blockly.Msg.SENSING_OF_XPOSITION = 'x position';
Blockly.Msg.SENSING_OF_YPOSITION = 'y position';
Blockly.Msg.SENSING_OF_DIRECTION = 'direction';
Blockly.Msg.SENSING_OF_COSTUMENUMBER = 'costume #';
Blockly.Msg.SENSING_OF_COSTUMENAME = 'costume name';
Blockly.Msg.SENSING_OF_SIZE = 'size';
Blockly.Msg.SENSING_OF_VOLUME = 'volume';
Blockly.Msg.SENSING_OF_BACKDROPNUMBER = 'backdrop #';
Blockly.Msg.SENSING_OF_BACKDROPNAME = 'backdrop name';
Blockly.Msg.SENSING_OF_STAGE = 'Stage';
Blockly.Msg.SENSING_CURRENT = 'current %1';
Blockly.Msg.SENSING_CURRENT_YEAR = 'year';
Blockly.Msg.SENSING_CURRENT_MONTH = 'month';
Blockly.Msg.SENSING_CURRENT_DATE = 'date';
Blockly.Msg.SENSING_CURRENT_DAYOFWEEK = 'day of week';
Blockly.Msg.SENSING_CURRENT_HOUR = 'hour';
Blockly.Msg.SENSING_CURRENT_MINUTE = 'minute';
Blockly.Msg.SENSING_CURRENT_SECOND = 'second';
Blockly.Msg.SENSING_DAYSSINCE2000 = 'days since 2000';
Blockly.Msg.SENSING_USERNAME = 'username';
Blockly.Msg.SENSING_USERID = 'user id';

// Merged extension blocks: Sensing
Blockly.Msg.SENSING_CURRENT_MILLISECOND = 'millisecond';
Blockly.Msg.SENSING_LASTKEYPRESSED = 'last key pressed';
Blockly.Msg.SENSING_MOUSEBUTTONDOWN = '%1 mouse button down?';
Blockly.Msg.SENSING_MOUSEBUTTON_PRIMARY = '(0) primary';
Blockly.Msg.SENSING_MOUSEBUTTON_MIDDLE = '(1) middle';
Blockly.Msg.SENSING_MOUSEBUTTON_SECONDARY = '(2) secondary';
Blockly.Msg.SENSING_SPRITECLICKED = 'sprite clicked?';
Blockly.Msg.SENSING_FPS = 'fps';
Blockly.Msg.SENSING_SCREEN = 'screen %1';
Blockly.Msg.SENSING_WINDOW = 'window %1';
Blockly.Msg.SENSING_DIMENSION_WIDTH = 'width';
Blockly.Msg.SENSING_DIMENSION_HEIGHT = 'height';
Blockly.Msg.SENSING_USERDETAIL = '%1 of user';
Blockly.Msg.SENSING_USERDETAIL_BROWSER = 'browser';
Blockly.Msg.SENSING_USERDETAIL_OS = 'operating system';
Blockly.Msg.SENSING_ISMOBILE = 'is mobile?';
Blockly.Msg.SENSING_CURRENTURL = 'current URL';
Blockly.Msg.SENSING_URLHASH = 'current URL hash';
Blockly.Msg.SENSING_CLIPBOARD = 'clipboard';
Blockly.Msg.SENSING_SETCLIPBOARD = 'set clipboard to %1';
Blockly.Msg.SENSING_ALERT = 'alert %1';
Blockly.Msg.SENSING_CONFIRM = 'confirm %1';
Blockly.Msg.SENSING_PROMPT = 'prompt %1 with default %2';
Blockly.Msg.SENSING_OPENLINK = 'open link %1 in new tab';
Blockly.Msg.SENSING_REDIRECT = 'redirect to link %1';
Blockly.Msg.SENSING_CONSOLE = 'console %1 %2';
Blockly.Msg.SENSING_CONSOLE_LOG = 'log';
Blockly.Msg.SENSING_CONSOLE_WARN = 'warn';
Blockly.Msg.SENSING_CONSOLE_ERROR = 'error';
Blockly.Msg.SENSING_CONSOLE_INFO = 'info';
Blockly.Msg.SENSING_CLEARCONSOLE = 'clear console';
Blockly.Msg.SENSING_FETCHURL = 'content from URL %1';
Blockly.Msg.SENSING_ALLSPRITES = 'all sprites';

// Sound blocks
Blockly.Msg.SOUND_PLAY = 'start sound %1';
Blockly.Msg.SOUND_PLAYUNTILDONE = 'play sound %1 until done';
Blockly.Msg.SOUND_STOPALLSOUNDS = 'stop all sounds';
Blockly.Msg.SOUND_SETEFFECTO = 'set %1 effect to %2';
Blockly.Msg.SOUND_CHANGEEFFECTBY = 'change %1 effect by %2';
Blockly.Msg.SOUND_CLEAREFFECTS = 'clear sound effects';
Blockly.Msg.SOUND_EFFECTS_PITCH = 'pitch';
Blockly.Msg.SOUND_EFFECTS_PAN = 'pan left/right';
Blockly.Msg.SOUND_CHANGEVOLUMEBY = 'change volume by %1';
Blockly.Msg.SOUND_SETVOLUMETO = 'set volume to %1%';
Blockly.Msg.SOUND_VOLUME = 'volume';
Blockly.Msg.SOUND_RECORD = 'record...';

// Merged extension blocks: Sound
Blockly.Msg.SOUND_IMPORTSOUND = 'add sound from URL %1 named %2';

// Category labels
Blockly.Msg.CATEGORY_MOTION = 'Motion';
Blockly.Msg.CATEGORY_LOOKS = 'Looks';
Blockly.Msg.CATEGORY_SOUND = 'Sound';
Blockly.Msg.CATEGORY_EVENTS = 'Events';
Blockly.Msg.CATEGORY_CONTROL = 'Control';
Blockly.Msg.CATEGORY_SENSING = 'Sensing';
Blockly.Msg.CATEGORY_OPERATORS = 'Operators';
Blockly.Msg.CATEGORY_VARIABLES = 'Variables';
Blockly.Msg.CATEGORY_MYBLOCKS = 'My Blocks';

// Context menus
Blockly.Msg.DUPLICATE = 'Duplicate';
Blockly.Msg.DELETE = 'Delete';
Blockly.Msg.ADD_COMMENT = 'Add Comment';
Blockly.Msg.REMOVE_COMMENT = 'Remove Comment';
Blockly.Msg.DELETE_BLOCK = 'Delete Block';
Blockly.Msg.DELETE_X_BLOCKS = 'Delete %1 Blocks';
Blockly.Msg.DELETE_ALL_BLOCKS = 'Delete all %1 blocks?';
Blockly.Msg.CLEAN_UP = 'Clean up Blocks';
Blockly.Msg.HELP = 'Help';
Blockly.Msg.UNDO = 'Undo';
Blockly.Msg.REDO = 'Redo';
Blockly.Msg.EDIT_PROCEDURE = 'Edit';
Blockly.Msg.SHOW_PROCEDURE_DEFINITION = 'Go to definition';
Blockly.Msg.WORKSPACE_COMMENT_DEFAULT_TEXT = 'Say something...';

// Color
Blockly.Msg.COLOUR_HUE_LABEL = 'Color';
Blockly.Msg.COLOUR_SATURATION_LABEL = 'Saturation';
Blockly.Msg.COLOUR_BRIGHTNESS_LABEL = 'Brightness';

// Variables
// @todo Remove these once fully managed by Scratch VM / Scratch GUI
Blockly.Msg.CHANGE_VALUE_TITLE = 'Change value:';
Blockly.Msg.RENAME_VARIABLE = 'Rename variable';
Blockly.Msg.RENAME_VARIABLE_TITLE = 'Rename all "%1" variables to:';
Blockly.Msg.RENAME_VARIABLE_MODAL_TITLE = 'Rename Variable';
Blockly.Msg.NEW_VARIABLE = 'Make a Variable';
Blockly.Msg.NEW_VARIABLE_TITLE = 'New variable name:';
Blockly.Msg.VARIABLE_MODAL_TITLE = 'New Variable';
Blockly.Msg.VARIABLE_ALREADY_EXISTS = 'A variable named "%1" already exists.';
Blockly.Msg.VARIABLE_ALREADY_EXISTS_FOR_ANOTHER_TYPE = 'A variable named "%1" already exists for another variable of type "%2".';
Blockly.Msg.DELETE_VARIABLE_CONFIRMATION = 'Delete %1 uses of the "%2" variable?';
Blockly.Msg.CANNOT_DELETE_VARIABLE_PROCEDURE = 'Can\'t delete the variable "%1" because it\'s part of the definition of the function "%2"';
Blockly.Msg.DELETE_VARIABLE = 'Delete the "%1" variable';

// Custom Procedures
// @todo Remove these once fully managed by Scratch VM / Scratch GUI
Blockly.Msg.NEW_PROCEDURE = 'Make a Block';
Blockly.Msg.PROCEDURE_ALREADY_EXISTS = 'A procedure named "%1" already exists.';
Blockly.Msg.PROCEDURE_DEFAULT_NAME = 'block name';
Blockly.Msg.PROCEDURE_USED = 'To delete a block definition, first remove all uses of the block';

// Lists
// @todo Remove these once fully managed by Scratch VM / Scratch GUI
Blockly.Msg.NEW_LIST = 'Make a List';
Blockly.Msg.NEW_LIST_TITLE = 'New list name:';
Blockly.Msg.LIST_MODAL_TITLE = 'New List';
Blockly.Msg.LIST_ALREADY_EXISTS = 'A list named "%1" already exists.';
Blockly.Msg.RENAME_LIST_TITLE = 'Rename all "%1" lists to:';
Blockly.Msg.RENAME_LIST_MODAL_TITLE = 'Rename List';
Blockly.Msg.DEFAULT_LIST_ITEM = 'thing';
Blockly.Msg.DELETE_LIST = 'Delete the "%1" list';
Blockly.Msg.RENAME_LIST = 'Rename list';

// Broadcast Messages
// @todo Remove these once fully managed by Scratch VM / Scratch GUI
Blockly.Msg.NEW_BROADCAST_MESSAGE = 'New message';
Blockly.Msg.NEW_BROADCAST_MESSAGE_TITLE = 'New message name:';
Blockly.Msg.BROADCAST_MODAL_TITLE = 'New Message';
Blockly.Msg.DEFAULT_BROADCAST_MESSAGE_NAME = 'message1';
