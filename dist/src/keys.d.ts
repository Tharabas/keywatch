/**
 * Checks if a provided KeyboardEvent targets an InputElement
 *
 * @param {KeyboardEvent} event
 * @return {boolean}
 */
export function isInInputElement(event: KeyboardEvent): boolean;
/**
 * Formats a KeyboardEvent as a string
 *
 * @param {KeyboardEvent} e        the key event to stringify
 * @param {boolean} [short=false]  render the short version of the keys
 * @param {boolean} [useMac=false] use the mac variant of the modifiers
 * @return {string} a string, that should be a valid key
 */
export function formatKeyEvent(e: KeyboardEvent, short?: boolean, useMac?: boolean): string;
/**
 * @callback KeyReaction
 * @param {KeyboardEvent} event    the event that completed the sequence
 * @param {KeySequence}   sequence the matched sequence
 */
/**
 * An object of handlers, where every value is either a reaction or another level of
 * keys - the levels are joined with a space when the object is unfolded.
 *
 * @typedef {Object<string, KeyReaction|KeyProviderObject>} KeyProviderObject
 */
/**
 * @typedef {KeySequence|Key|string|Array<*>|KeyProviderObject} KeyProvider
 */
/**
 * @typedef {Object} KeySequenceDefinition
 * @property {KeySequence} sequence
 * @property {KeyReaction} handler
 */
/**
 * @callback Disposer
 */
/**
 * Register a Key or Sequence of Keys to a handler method.
 *
 * @param {KeyProvider|function(): KeyProvider} sequence the key, sequence or KeyProvider to match
 * @param {KeyReaction|null}                    reaction the handler function to the sequence(s)
 * @param {*}                                   ref      a reference for removal of the handler
 * @return {Disposer}                                    a disposal function for the registered reactions
 */
export function watch(sequence: KeyProvider | (() => KeyProvider), reaction: KeyReaction | null, ref?: any): Disposer;
/**
 * Unfolds a compressed definition to an array KeySequenceDefinitions.
 *
 * @param {KeyProvider} definition
 * @param {KeyReaction|null} [handler=null]
 * @return {KeySequenceDefinition[]}
 */
export function unfoldKeyDefinition(definition: KeyProvider, handler?: KeyReaction | null): KeySequenceDefinition[];
/**
 * Internal function that watches a single KeySequence
 *
 * @param {KeySequence}  sequence a single Sequence to match
 * @param {KeyReaction}  reaction the handler function for the matched keys
 * @param {*} [ref=null]
 * @return {Disposer}             a disposal function for the registered reactions
 */
export function watchSequence(sequence: KeySequence, reaction: KeyReaction, ref?: any): Disposer;
/**
 * @typedef {Object} ScopedWatcher
 * @property {function(KeyProvider, KeyReaction): Disposer} watch   registers keys under the scope
 * @property {function(): void}                            unwatch disposes everything in the scope
 */
/**
 * Returns a scoped watch helper.
 *
 * @param {*} ref          the reference all watchers of this scope are registered under
 * @return {ScopedWatcher}
 */
export function of(ref: any): ScopedWatcher;
/**
 * Disposes all listeners for a specific reference
 *
 * @param {*} ref
 */
export function unwatchAll(ref: any): void;
/**
 * Represents a single Key for matching.
 */
export class Key {
    /**
     * Tries to parse a Key from a string definition.
     *
     * @param {Key|string} definition
     * @return {Key}
     */
    static parse(definition: Key | string): Key;
    /**
     * @param {string}       code              the KeyboardEvent code or key to match
     * @param {boolean}     [isCode=true]      match against event.code instead of event.key
     * @param {boolean}     [shiftKey=false]   require the shift key to be down
     * @param {boolean}     [ctrlKey=false]    require the control key to be down
     * @param {boolean}     [altKey=false]     require the alt key to be down
     * @param {boolean}     [metaKey=false]    require the meta key to be down
     * @param {boolean|null} [inInput=null]    allow the match inside input elements
     * @param {string}      [type='up']        the event type to match: up, down or press
     */
    constructor(code: string, isCode?: boolean, shiftKey?: boolean, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean, inInput?: boolean | null, type?: string);
    code: string;
    isCode: boolean;
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    inInput: boolean;
    type: string;
    /**
     * @param {KeyboardEvent} e
     * @return {boolean}
     */
    matches(e: KeyboardEvent): boolean;
    /**
     * @return {string}
     */
    get outputType(): string;
    toString(short?: boolean): string;
}
/**
 * Defines a sequence of keys that should be matched.
 */
export class KeySequence {
    /**
     * @param {KeySequence|string|Array<Key|string>} definitions
     * @return {KeySequence}
     */
    static parse(definitions: KeySequence | string | Array<Key | string>): KeySequence;
    /**
     * @param {Key[]}   keys           a sequence of single Keys to match
     * @param {boolean} preventDefault if true the sequence will prevent the default behaviour of the key
     * @param {string}  onSystem       if defined the sequence will only trigger on the specified operating system
     */
    constructor(keys: Key[], preventDefault?: boolean, onSystem?: string);
    keys: Key[];
    preventDefault: boolean;
    onSystem: string;
    get keyCount(): number;
    /**
     * @param {KeyboardEvent[]} keyEvents
     * @return {boolean}
     */
    matches(keyEvents: KeyboardEvent[]): boolean;
    toString(short?: boolean): string;
}
export class KeySequenceListener {
    /**
     * @param {KeySequence|string} keys     the sequence to match
     * @param {KeyReaction}        reaction the handler for the matched sequence
     * @param {*}                  ref      a reference for removal of the handler
     */
    constructor(keys: KeySequence | string, reaction: KeyReaction, ref: any);
    sequence: KeySequence;
    reaction: KeyReaction;
    ref: any;
    get keyCount(): number;
    get preventsDefault(): boolean;
    /**
     * @param {KeyboardEvent[]} keyEvents
     * @return {boolean}
     */
    matches(keyEvents: KeyboardEvent[]): boolean;
    /**
     * @param {*} ref
     * @return {boolean}
     */
    hasRef(ref: any): boolean;
    toString(): string;
}
export type KeyReaction = (event: KeyboardEvent, sequence: KeySequence) => any;
/**
 * An object of handlers, where every value is either a reaction or another level of
 * keys - the levels are joined with a space when the object is unfolded.
 */
export type KeyProviderObject = any;
export type KeyProvider = KeySequence | Key | string | Array<any> | KeyProviderObject;
export type KeySequenceDefinition = {
    sequence: KeySequence;
    handler: KeyReaction;
};
export type Disposer = () => any;
export type ScopedWatcher = {
    /**
     * registers keys under the scope
     */
    watch: (arg0: KeyProvider, arg1: KeyReaction) => Disposer;
    /**
     * disposes everything in the scope
     */
    unwatch: () => void;
};
