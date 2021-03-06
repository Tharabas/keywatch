/** @global module */

import { isString, last, contains, isObject } from './lib'

//
// shortcut related functions afterwards
//

// keeps information about whether global shortcuts are active (set up)
let isActive = false

// a list of KeySequenceListeners
const listeners = []

// a list of KeyboardEvents
let lastKeys = []

// the number of KeyboardEvents, that should be kept for checking sequences
let MaxKeptKeys = 1

// a warning threshold
const MaxKeptKeysWarningThreshold = 10

// a list of KeyEvent Modifiers
const ModifierKeys = Object.freeze(['Shift', 'Control', 'Alt', 'Meta'])

// a list of tracked EventType Modifiers
const EventTypeModifier = Object.freeze(['up', 'down'])

// a list of Elements treated as input elements
const InputElements = Object.freeze(['INPUT', 'TEXTAREA', 'SELECT'])

// checks whether the client runs on a mac, used only for formatting
const isMac = navigator.platform.includes("Mac")

// checks whether the client runs on a windows machine
const isWin = navigator.platform.includes("Win")

// check whether the client is neither on Mac nor on Windows
const isOther = !isMac && !isWin

function isOnSystem (system) {
  switch ((system || '').trim()) {
    case '': return true
    case 'mac': return isMac
    case 'win': return isWin
    default: return false
  }
}

/**
 * Checks if a provided KeyboardEvent targets an InputElement
 *
 * @param {KeyboardEvent} event
 * @return {boolean}
 */
export function isInInputElement (event) {
  return contains(InputElements, event.target.tagName)
}

/**
 * Formats a KeyboardEvent as a string
 *
 * @param {KeyboardEvent} e        the key event to stringify
 * @param {boolean} [short=false]  render the short version of the keys
 * @param {boolean} [useMac=false] use the mac variant of the modifiers
 * @return {string} a string, that should be a valid key
 */
export function formatKeyEvent (e, short = false, useMac = false) {
  let k = ''

  if (e.shiftKey) k += ['Shift ', useMac ? '⇧' : '+'][+short]
  if (e.ctrlKey) k += ['Control ', '^'][+short]
  if (e.altKey) k += ['Alt ', useMac ? '⌥' : '#'][+short]
  if (e.metaKey) k += [useMac ? 'Meta ' : 'Command ', useMac ? '⌘' : '@'][+short]

  const alias = codeToAlias(e.code)
  if (short && alias) {
    k += alias
  } else if (short && e.code.toLowerCase() === ('key' + e.key).toLowerCase()) {
    k += e.key
  } else {
    k += e.code
  }

  if (e.type === 'keydown') k += ' Down'
  if (e.type === 'keypress') k += ' Press'

  return k
}

/**
 * Checks whether the provided KeyboardEvent originates from a Modifier Key
 *
 * @param {KeyboardEvent} event
 * @return {boolean}
 */
function isModifierKey (event) {
  return contains(ModifierKeys, event.key)
}

/**
 * Setup the Keywatch Listeners.
 */
function setUp () {
  if (isActive) return
  isActive = true
  document.addEventListener('keyup', handleGlobalKeys)
  document.addEventListener('keydown', handleGlobalKeys)
}

/**
 * Remove the Listeners used for the Keywatch
 */
function tearDown () {
  if (!isActive) return
  document.addEventListener('keyup', handleGlobalKeys)
  document.addEventListener('keydown', handleGlobalKeys)
  isActive = false
}

/**
 * Keywatch global event handler.
 * This is the main key processing routine!
 *
 * @param {KeyboardEvent} event
 */
function handleGlobalKeys (event) {
  // work on a copy of our last keys
  const keys = lastKeys.slice(0)

  // when facing a KeyUp, replace a previous KeyDown for the same Key
  if (event.type === 'keyup') {
    const prev = last(keys)
    if (prev && prev.type === 'keydown' && prev.code === event.code) {
      // remove the last key, if it's the same as before
      keys.pop()
    }
  }

  // append the current event for the checks
  keys.push(event)

  let matched = false
  for (const listener of listeners) {
    if (event.defaultPrevented) {
      break
    }
    if (listener.matches(keys)) {
      matched = true
      listener.reaction(event, listener.sequence)

      if (listener.preventsDefault) {
        event.preventDefault()
        break
      }
    }
  }

  if (matched) {
    // if we matched something clean out the last keys
    lastKeys = []
    return
  }

  // do not keep modifier key events (like CtrlDown) for sequences
  if (isModifierKey(event)) {
    keys.pop()
  }

  while (keys.length > MaxKeptKeys) {
    keys.shift()
  }

  // overwrite our last keys
  lastKeys = keys
}

// JSDoc notation for a KeyboardEvent
/**
 * @callback KeyReaction
 * @param {KeyboardEvent} event
 * @param {KeySequence} the matched sequence
 */

/**
 * @typedef {KeySequence | Key | string | { [string]: KeyProvider }} KeyProvider
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
 * @param {function(): KeyProvider|KeyProvider} sequence the key, sequence or KeyProvider to match
 * @param {KeyReaction|null}                    reaction the handler function to the sequence(s)
 * @param {*}                                   ref      a reference for removal of the handler
 * @return {Disposer}                                    a disposal function for the registered reactions
 */
export function watch (sequence, reaction, ref = null) {
  if (ref === null && typeof reaction !== 'function') {
    // shift ref right if it was provided in the reaction slot
    ref = reaction
    reaction = null
  }

  const definitions = unfoldKeyDefinition(sequence, reaction)
  const unwatcher = definitions.map(def => {
    try {
      const dispose = watchSequence(def.sequence, def.handler, ref)
      return {
        dispose,
        sequence: def.sequence,
        handler: def.handler,
        ref
      }
    } catch (ex) {
      return null
    }
  }).filter(def => def !== null)

  return () => {
    unwatcher.forEach((u, idx) => {
      try { u.dispose() } catch (ex) {
        console.warn('failed to unwatch', idx, ex)
      }
    })
  }
}

/**
 * Unfolds a compressed definition to an array KeySequenceDefinitions.
 *
 * @param {KeyProvider} definition
 * @param {KeyReaction|null} [handler=null]
 * @return {KeySequenceDefinition[]}
 */
export function unfoldKeyDefinition (definition, handler = null) {
  // first param is a function, eval and try again!
  if (typeof definition === 'function') {
    return unfoldKeyDefinition(definition(), handler)
  }

  // definition is an object, unfold
  if (isObject(definition)) {
    return unfoldKeyDefinition(unfoldKeyObject(definition, ''))
  }

  if (isString(definition)) {
    return unfoldKeyDefinition([{ keys: definition, handler }])
  }

  if (!Array.isArray(definition)) {
    throw new Error(`sequence should be defined as an array`)
  }

  if (handler != null) {
    return unfoldKeyDefinition([{ keys: definition, handler }])
  }

  // until the definition should only contain { sequence, handler }
  return definition.map((def, index) => {
    const seq = def.sequence || def.keys || def.key
    try {
      const sequence = KeySequence.parse(seq)
      return { sequence, handler: def.handler }
    } catch (ex) {
      console.warn('Dropping invalid sequence from', def, index, definition, def.handler, ex)
      return null
    }
  }).filter(def => def !== null)
}

/**
 * @param {{ [string]: function(): void }} o
 * @param {string} prefix
 * @return {{sequence: string, handler: *}[]}
 */
function unfoldKeyObject (o, prefix) {
  return Object.keys(o).flatMap(key => {
    const handler = o[key]

    if (typeof handler === 'function') {
      // as expected
      return [{ keys: prefix + key, handler }]
    }

    if (isObject(handler)) {
      // we have to go deeper
      return unfoldKeyObject(handler, prefix + key + ' ')
    }

    throw new Error(`Expected value of key '${key}' to be a function, got '${typeof handler}'`)
  })
}


/**
 * Internal function that watches a single KeySequence
 *
 * @param {KeySequence}  sequence a single Sequence to match
 * @param {KeyReaction}  reaction the handler function for the matched keys
 * @param {*} [ref=null]
 * @return {Disposer}             a disposal function for the registered reactions
 */
export function watchSequence(sequence, reaction, ref = null) {
  const listener = new KeySequenceListener(sequence, reaction, ref)

  if (listener.keyCount > MaxKeptKeys) {
    MaxKeptKeys = listener.keyCount
    if (MaxKeptKeys > MaxKeptKeysWarningThreshold) {
      // eslint-disable-next-line no-console
      console.warn(`increasing MaxKeptKeys to ${MaxKeptKeys} for sequence`, listener.sequence)
    }
  }
  listeners.unshift(listener)

  if (!isActive) {
    setUp()
  }

  return () => unwatch(listener)
}

/**
 * Dispose (aka removeEventListener) for a previously registered keyboard event
 *
 * @param {KeySequenceListener} listener
 */
function unwatch (listener) {
  for (let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i] === listener) {
      listeners.splice(i, 1)
    }
  }

  afterUnwatch()
}

/**
 * Returns a scoped watch helper.
 *
 * @param ref
 * @return {{watch(*=, *=): function(): void, unwatch(*=): void}|(function(): void)}
 */
export function of (ref) {
  return {
    watch (sequence, reaction) {
      return watch(sequence, reaction, ref)
    },
    unwatch () {
      unwatchAll(ref)
    }
  }
}


/**
 * Disposes all listeners for a specific reference
 *
 * @param {*} ref
 */
export function unwatchAll (ref) {
  for (let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i].ref === ref) {
      listeners.splice(i, 1)
    }
  }

  afterUnwatch()
}

/**
 * After some messages have been disposed, maybe do some cleanup.
 * For internal use only.
 */
function afterUnwatch () {
  MaxKeptKeys = Math.max(1, ...listeners.map(l => l.keyCount))

  if (listeners.length === 0 && isActive) {
    tearDown()
  }
}

//
// classes
//

// noinspection NonAsciiCharacters
const CodeAliases = {
  '↑': 'ArrowUp',
  '↓': 'ArrowDown',
  '←': 'ArrowLeft',
  '→': 'ArrowRight',
  '⎋': 'Escape',
  '⇥': 'Tab',
  '⏎': 'Enter',
  '⌤': 'NumpadEnter',
  '⇞': 'PageUp',
  '⇟': 'PageDown',
  '↖︎': 'Home',
  '↘︎': 'End',
  '⌫': 'Backspace',
  '⌦': 'Delete',
  '␣': 'Space',
}

function codeToAlias (code) {
  return Object.keys(CodeAliases).find(key => CodeAliases[key] === code)
}

function replaceAliases (s) {
  return Object.keys(CodeAliases).reduce((re, alias) => re.replace(alias, ' ' + CodeAliases[alias] + ' '), s)
}

/**
 * Represents a single Key for matching.
 */
export class Key {
  constructor (
    code,
    isCode = true,
    shiftKey = false,
    ctrlKey = false,
    altKey = false,
    metaKey = false,
    inInput = null,
    type = 'up',
  ) {
    this.code = code
    this.isCode = isCode
    this.shiftKey = shiftKey
    this.ctrlKey = ctrlKey
    this.altKey = altKey
    this.metaKey = metaKey
    this.inInput = inInput
    this.type = (type.startsWith('key') ? type : 'key' + type).toLowerCase()
  }

  matches (e) {
    // can't match if it is the wrong type (up/down/press)
    if (e.type !== this.type) return false

    // when inInput is false skip if the element targets an input element
    if (!this.inInput && isInInputElement(e)) return false

    // now check whether all modifiers are exactly as expected
    if (e.shiftKey !== this.shiftKey) return false
    if (e.ctrlKey !== this.ctrlKey) return false
    if (e.altKey !== this.altKey) return false
    if (e.metaKey !== this.metaKey) return false

    // isCode = true  : compare code
    // isCode = false : compare key
    const code = this.isCode ? e.code : e.key
    return this.code === code
  }

  /**
   * @return {string}
   */
  get outputType () {
    return this.type.substring(3).split('').map((s, i) => i === 0 ? s.toUpperCase() : s).join('')
  }

  toString (short = false) {
    if (short) {
      return [
        !this.inInput && ':',
        this.metaKey && (isMac ? '⌘' : '@'),
        this.ctrlKey && '^',
        this.altKey && (isMac ? '⌥' : '#'),
        this.shiftKey && '+',
        this.code,
        this.outputType === 'Up' ? '' : this.outputType
      ].filter(x => x).join('')
    }
    return [
      !this.inInput && 'NoInput',
      this.metaKey && (isMac ? 'Command ' : 'Meta'),
      this.ctrlKey && 'Control',
      this.altKey && 'Alt',
      this.shiftKey && 'Shift',
      this.code,
      this.outputType,
    ].filter(x => x).join(' ')
  }

  /**
   * Tries to parse a Key from a string definition.
   *
   * @param {string} definition
   * @return {Key}
   */
  static parse (definition) {
    if (definition instanceof Key) {
      return definition
    }

    if (definition.trim().length === 0) {
      throw new Error('Key definition must not be empty!')
    }

    // unfold modifiers
    const parsed =
      replaceAliases(
        definition
        .replace(/:/, ' NoInput ')
        .replace(/([@⌘]|Command)/i, ' Meta ')
        .replace(/(\^|ctrl)/, ' Control ')
        .replace(/([#⌥]+)/, ' Alt ')
        .replace(/[+⇧]+/, ' Shift ')
      )
      .replace(/_+(\w+)/g, (_, sub) => ' ' + sub)
      .split(/\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // last element should be Up / Down / Press
    if (!contains(EventTypeModifier, last(parsed).toLowerCase())) {
      parsed.push(contains(parsed, 'Meta') || contains(parsed, 'Control') ? 'down' : 'up')
    }

    const type = last(parsed).toLowerCase()

    const significant = parsed.slice(-2)[0]
    const isCode = significant.length > 1
    const modifier = parsed.slice(0, -2).map(m => m.toLowerCase())

    return new Key(
      significant,
      isCode,
      contains(modifier, 'shift'),
      contains(modifier, 'control'),
      contains(modifier, 'alt'),
      contains(modifier, 'meta'),
      !contains(modifier, 'noinput'),
      last(parsed),
      type
    )
  }
}

/**
 * Defines a sequence of keys that should be matched.
 */
export class KeySequence {
  /**
   * @param {Key[]}   keys           a sequence of single Keys to match
   * @param {boolean} preventDefault if true the sequence will prevent the default behaviour of the key
   * @param {string}  onSystem       if defined the sequence will only trigger on the specified operating system
   */
  constructor (keys, preventDefault = false, onSystem = null) {
    if (keys.length < 1) {
      throw new Error('A KeySequence must contain at least one key, none provided!')
    }

    this.keys = keys
    this.preventDefault = preventDefault
    this.onSystem = onSystem
  }

  get keyCount () {
    return this.keys.length
  }

  matches (keyEvents) {
    if (keyEvents.length < this.keyCount) {
      // not possibly long enough to be a match
      return false
    }

    if (!isOnSystem(this.onSystem)) return false

    // match the last n elements of the keyEvents
    const subEvents = keyEvents.slice(-this.keyCount)

    for (let i = 0, max = this.keyCount; i < max; i++) {
      const key = this.keys[i]
      const event = subEvents[i]
      if (!key.matches(event)) {
        // stop checking on mismatch
        return false
      }
    }

    // no mismatch ... must be a match!
    return true
  }

  toString (short = false) {
    return this.keys.map(key => key.toString(short)).join(', ')
  }

  static parse (definitions) {
    if (definitions instanceof KeySequence) {
      return definitions
    }

    let workDef = definitions

    let onSystem = null
    let preventDefault = false

    if (isString(workDef)) {
      const rxSystem = /(.*)\bon(?:ly)-?(win|mac|u?nix)\s+(.+)/i
      const systemMatch = rxSystem.exec(workDef)
      if (systemMatch !== null) {
        onSystem = systemMatch[2].toLowerCase()
        workDef = (systemMatch[1] + systemMatch[3]).trim()
      }

      const rxNoDefault = /(.*)(^!|no-?default\s+|prevent\s+)(.+)/i
      const noDefaultMatch = rxNoDefault.exec(workDef)
      if (noDefaultMatch !== null) {
        preventDefault = true
        workDef = (noDefaultMatch[1] + noDefaultMatch[3]).trim()
      }
    }

    const keyDefinitions = Array.isArray(workDef) ? workDef : workDef.split(/\s*,\s*/)
    const keys = keyDefinitions.map((definition, index) => {
      try {
        return Key.parse(definition)
      } catch (err) {
        throw new Error(`Unable to parse key definition #${index} "${definition}" in sequence "${definitions}: ${err.message}"`)
      }
    })

    return new KeySequence(keys, preventDefault, onSystem)
  }
}

export class KeySequenceListener {
  constructor (keys, reaction, ref) {
    this.sequence = KeySequence.parse(keys)
    this.reaction = reaction
    this.ref = ref
  }

  get keyCount () {
    return this.sequence.keyCount
  }

  get preventsDefault () {
    return this.sequence.preventDefault
  }

  matches (keyEvents) {
    return this.sequence.matches(keyEvents)
  }

  hasRef (ref) {
    return this.ref === ref
  }

  toString () {
    return this.sequence.toString()
  }
}

//
// To handle HotModuleReload dispose all elements once the module is reloaded
//
if (window.module && window.module.hot && window.module.hot.addDisposeHandler) {
  window.module.hot.addDisposeHandler(tearDown)
}

