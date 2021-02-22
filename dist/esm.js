/**
 * Returns the last Element of an Array
 *
 * @param {Array} arr
 * @return {*}
 */
function last (arr) {
  return arr.slice(-1)[0]
}

/**
 * Checks whether the Haystack Array contains a needle element
 * @param {Array} haystack
 * @param {*} needle
 * @return {boolean}
 */
function contains (haystack, needle) {
  return haystack.indexOf(needle) !== -1
}

/**
 * Checks if the provided argument is a string
 *
 * @param {*} s
 * @return {boolean}
 */
function isString (s) {
  return typeof s === 'string'
}

/**
 * Checks if the provided argument is an Object
 *
 * @param {*} obj
 * @return {boolean}
 */
function isObject (obj) {
  return !Array.isArray(obj) && Object.prototype.isPrototypeOf(obj)
}

/** @global module */

//
// shortcut related functions afterwards
//

// keeps information about whether global shortcuts are active (set up)
let isActive = false;

// a list of KeySequenceListeners
const listeners = [];

// a list of KeyboardEvents
let lastKeys = [];

// the number of KeyboardEvents, that should be kept for checking sequences
let MaxKeptKeys = 1;

// a warning threshold
const MaxKeptKeysWarningThreshold = 10;

// a list of KeyEvent Modifiers
const ModifierKeys = Object.freeze(['Shift', 'Control', 'Alt', 'Meta']);

// a list of tracked EventType Modifiers
const EventTypeModifier = Object.freeze(['up', 'down']);

// a list of Elements treated as input elements
const InputElements = Object.freeze(['INPUT', 'TEXTAREA', 'SELECT']);

// checks whether the client runs on a mac, used only for formatting
const isMac = navigator.userAgent.indexOf('Macintosh') !== -1;

/**
 * Checks if a provided KeyboardEvent targets an InputElement
 *
 * @param {KeyboardEvent} event
 * @return {boolean}
 */
function isInInputElement (event) {
  return contains(InputElements, event.target.tagName)
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
  isActive = true;
  document.addEventListener('keyup', handleGlobalKeys);
  document.addEventListener('keydown', handleGlobalKeys);
}

/**
 * Remove the Listeners used for the Keywatch
 */
function tearDown () {
  if (!isActive) return
  document.addEventListener('keyup', handleGlobalKeys);
  document.addEventListener('keydown', handleGlobalKeys);
  isActive = false;
}

/**
 * Keywatch global event handler.
 * This is the main key processing routine!
 *
 * @param {KeyboardEvent} event
 */
function handleGlobalKeys (event) {
  // work on a copy of our last keys
  const keys = lastKeys.slice(0);

  // when facing a KeyUp, replace a previous KeyDown for the same Key
  if (event.type === 'keyup') {
    const prev = last(keys);
    if (prev && prev.type === 'keydown' && prev.code === event.code) {
      // remove the last key, if it's the same as before
      keys.pop();
    }
  }

  // append the current event for the checks
  keys.push(event);

  let matched = false;
  for (const listener of listeners) {
    if (event.defaultPrevented) {
      break
    }
    if (listener.matches(keys)) {
      matched = true;
      // console.log(`Matched sequence ${listener}`)
      listener.reaction(event, listener.sequence);

      if (listener.preventsDefault) {
        event.preventDefault();
        break
      }
    }
  }

  if (matched) {
    // if we matched something clean out the last keys
    lastKeys = [];
    return
  }

  // do not keep modifier key events (like CtrlDown) for sequences
  if (isModifierKey(event)) {
    keys.pop();
  }

  while (keys.length > MaxKeptKeys) {
    keys.shift();
  }

  // overwrite our last keys
  lastKeys = keys;
}

// JSDoc notation for a KeyboardEvent
/**
 * @callback keyReaction
 * @param {KeyboardEvent} event
 */

/**
 * Register a Key or Sequence of Keys to a handler method.
 *
 * @param {KeySequence|Key|string} sequence the key or sequence to match
 * @param {keyReaction} reaction the handler reaction to the sequence
 * @param {*|null} ref a reference for removal of the handler
 * @return {function(): void} a disposal function for the registered reaction
 */
function watch (sequence, reaction, ref = null) {
  const listener = new KeySequenceListener(sequence, reaction, ref);

  if (listener.keyCount > MaxKeptKeys) {
    MaxKeptKeys = listener.keyCount;
    if (MaxKeptKeys > MaxKeptKeysWarningThreshold) {
      // eslint-disable-next-line no-console
      console.warn(`increasing MaxKeptKeys to ${MaxKeptKeys} for sequence`, listener.sequence);
    }
  }
  listeners.unshift(listener);

  if (!isActive) {
    setUp();
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
      listeners.splice(i, 1);
    }
  }

  afterUnwatch();
}

/**
 * Returns a scoped watch helper.
 *
 * @param ref
 * @return {{watch(*=, *=): function(): void, unwatch(*=): void}|(function(): void)}
 */
function of (ref) {
  return {
    watch (sequence, reaction) {
      return watch(sequence, reaction, ref)
    },
    unwatch (reaction) {
      if (typeof reaction === 'undefined') {
        // unwatch all
        unwatchAll(ref);
      } else {
        unwatch(reaction);
      }
    }
  }
}


/**
 * Disposes all listeners for a specific reference
 *
 * @param {*} ref
 */
function unwatchAll (ref) {
  for (let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i].ref === ref) {
      listeners.splice(i, 1);
    }
  }

  afterUnwatch();
}

/**
 * After some messages have been disposed, maybe do some cleanup.
 * For internal use only.
 */
function afterUnwatch () {
  MaxKeptKeys = Math.max(1, ...listeners.map(l => l.keyCount));

  if (listeners.length === 0 && isActive) {
    tearDown();
  }
}

//
// classes
//

/**
 * Represents a single Key for matching.
 */
class Key {
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
    this.code = code;
    this.isCode = isCode;
    this.shiftKey = shiftKey;
    this.ctrlKey = ctrlKey;
    this.altKey = altKey;
    this.metaKey = metaKey;
    this.inInput = inInput;
    this.type = (type.startsWith('key') ? type : 'key' + type).toLowerCase();
  }

  matches (e) {
    // can't match if is's the wrong type (up/down/press)
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
    const code = this.isCode ? e.code : e.key;
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

    // unfold modifiers
    const parsed = definition
      .replace(/:/, ' NoInput ')
      .replace(/([@⌘]|Command)/i, ' Meta ')
      .replace(/(\^|ctrl)/, ' Control ')
      .replace(/([#⌥]+)/, ' Alt ')
      .replace(/[+⇧]+/, ' Shift ')
      .replace(/⎋/, ' Escape ')
      .replace(/⏎/, ' Return ')
      .replace(/↑/, ' Up ')
      .replace(/↓/, ' Down ')
      .replace(/_+(\w+)/g, (_, sub) => ' ' + sub)
      .split(/\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // last element should be Up / Down / Press
    if (!contains(EventTypeModifier, last(parsed).toLowerCase())) {
      parsed.push(contains(parsed, 'Meta') || contains(parsed, 'Control') ? 'down' : 'up');
    }

    const type = last(parsed).toLowerCase();

    const significant = parsed.slice(-2)[0];
    const isCode = significant.length > 1;
    const modifier = parsed.slice(0, -2).map(m => m.toLowerCase());

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
 *
 */
class KeySequence {
  constructor (keys, preventDefault = false) {
    if (keys.length < 1) {
      throw new Error('A KeySequence must contain at least one key, none provided!')
    }

    this.keys = keys;
    this.preventDefault = preventDefault;
  }

  get keyCount () {
    return this.keys.length
  }

  matches (keyEvents) {
    if (keyEvents.length < this.keyCount) {
      // not possibly long enough to be a match
      return false
    }

    // match the last n elements of the keyEvents
    const subEvents = keyEvents.slice(-this.keyCount);

    for (let i = 0, max = this.keyCount; i < max; i++) {
      const key = this.keys[i];
      const event = subEvents[i];
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

    let preventDefault = false;
    const rx = /^(!|no-?default |prevent )(.+)/i;
    if (isString(definitions) && rx.test(definitions)) {
      rx.exec(definitions)[2];
      preventDefault = true;
    }

    const keyDefinitions = Array.isArray(definitions) ? definitions : definitions.split(/\s*,\s*/);
    const keys = keyDefinitions.map((definition, index) => {
      try {
        return Key.parse(definition)
      } catch (err) {
        throw new Error(`Unable to parse key definition #${index} "${definition}" in sequence "${definitions}"`)
      }
    });

    return new KeySequence(keys, preventDefault)
  }
}

class KeySequenceListener {
  constructor (keys, reaction, ref) {
    this.sequence = KeySequence.parse(keys);
    this.reaction = reaction;
    this.ref = ref;
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
  window.module.hot.addDisposeHandler(tearDown);
}

function watchKeys (instance, keys, options) {
  if (instance instanceof Promise) {
    return instance.then(result => watchKeys(instance, result))
  }

  if (isObject(keys)) {
    keys = Object.keys(keys).map((key) => {
      return { key, handler: keys[key] }
    });
  }

  if (!Array.isArray(keys)) {
    throw new Error(`shortcuts should be defined as an array!`)
  }

  // parse shortcuts
  const unwatcher = [];
  for (const definition of keys) {
    const definitionKeys = definition.keys || definition.key;
    let reaction = definition.handler;
    if (isString(reaction)) {
      if (this.hasOwnProperty(reaction)) {
        reaction = instance[reaction];
      } else {
        console.warn(`skipped binding %O to undefined method '%O' on %O`, definitionKeys, reaction, instance);
        continue
      }
    }
    const dispose = watch(definitionKeys, reaction.bind(instance), instance);
    unwatcher.push(dispose);
  }
  return () => unwatcher.forEach((dispose, idx) => {
    try {
      dispose();
    } catch (err) {
      console.warn('failed to dispose', dispose, idx, err);
    }
  })
}

/**
 * VueJS Mixin
 *
 * Use it like this:
 * {
 *   mixins: [
 *     Keywatch.Mixin({
 *       'Control KeyN'(event) {
 *         // this refers to the Vue instance
 *         this.showSomeDialog()
 *       }
 *     })
 *   ]
 * }
 *
 * Or use the provided Method watchKeys(keys, handler)
 *
 * mounted() {
 *   this.$watchKeys('Control KeyN', this.showSomeDialog)
 * }
 *
 * @param {*} keys
 * @param {*} options
 * @return {{methods: {
 *   $watchKeys(*=, *=): function(): void},
 *   beforeDestroy(): void,
 *   mounted(): undefined
 * }}
 */
function vueMixin (keys = null, options = {}) {
  return {
    mounted () {
      if (!keys) {
        // it's not required to watch shortcuts here
        return
      }


      // watch property / computed
      if (isString(keys)) {
        let unwatch = null;
        const updateWith = to => {
          if (unwatch) try {
            unwatch();
          } catch (ex) {
            console.warn('failed to unwatch', this, ex);
          }

          if (to) {
            unwatch = watchKeys(this, to);
          } else {
            unwatch = null;
          }
        };
        updateWith(this[keys]);
        this.$watch(keys, updateWith);
        return
      }

      // use a one-shot version, probably an object or object provider
      if (typeof keys === 'function') {
        watchKeys(this, keys.call(this));
      } else {
        watchKeys(this, keys);
      }
    },
    /**
     * Automatically unwatch all watched keys
     */
    beforeDestroy () {
      unwatchAll(this);
    },
    methods: {
      $watchKeys (keys, handler) {
        return watch(keys, handler, this)
      },
    }
  }
}

export { vueMixin as Mixin, of, unwatch, unwatchAll, watch };
