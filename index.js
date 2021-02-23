/**
 * Keywatch Service
 *
 * It's meant to handle registration of global keys or sequences of keys
 *
 * How to define Key Sequences:
 *
 * Keywatch.watch(<definition>, <handler>, <reference>)
 *
 * where <definition> defines which sequence should be caught
 * and <handler> is function, that's given the events, that caused the sequence.
 *
 * A <definition> defines what sequence will be looked for.
 * it may be a simple char (like 'a', 'b', 'z', etc.) or a compound key.
 *
 * <definition> ::= <token> | <token>, <definition> | <definition> '|' <definition>
 * <token>      ::= <modifier> <char> | <char>
 * <char>       ::= <named_char> | <raw_char>
 * <named_key>  ::= 'Escape' | 'Enter' | 'KeyX' | ...
 *              (see https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values for a full list)
 * <raw_key>    ::= (any single character, that's not a named key)
 * <modifier>   ::= '+' require shiftKey
 *                | '^' require ctrlKey
 *                | '#' require altKey
 *                | '@' require metaKey (cmd @ mac, win @ win, meta @ others)
 *                | ':' require ignore-with-input-target
 *
 * So a usual sequence definition will look like this:
 *
 * "^s": -> xyz.save() # will call xyz.save on ctrl+s
 *
 * "#ESC": -> abort()  # will call abort() on hitting alt+ESC
 *
 * "i,d,d,q,d": -> enableGodmode() # will call enableGodmode() after the
 * # full sequence has been entered
 *
 * "ESC,w,+1,ENTER" -> save() # will call save() on hitting ESC -> w -> ! -> ENTER
 *
 * So 'CARET,AT,HOME' will trigger when hitting the sequence ": -> @ -> HOME KEY"
 * The maximum time (ms) between key triggers can be adjusted by setting the ShortcutService.couplingThreshold value
 */

export {
  Key,
  KeySequence,
  KeySequenceListener,
  formatKeyEvent,
  of,
  unwatchAll,
  unfoldKeyDefinition,
  watch,
} from './src/keys'
export { default as Mixin } from './src/vue-mixin'
