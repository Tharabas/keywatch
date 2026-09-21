import { afterEach, describe, expect, it, vi } from 'vitest'
import { Key, KeySequence, of, unwatchAll, watch } from '../index.js'

/**
 * keywatch keeps its listeners in module global state, so every test has to clean up
 * after itself - otherwise a watcher of an earlier test still reacts in a later one.
 */
const registered = []

function watching (definition, reaction) {
  const dispose = watch(definition, reaction)
  registered.push(dispose)
  return dispose
}

function press (code, options = {}) {
  const {
    type = 'keyup',
    key = code,
    target = document,
    ...modifiers
  } = options

  target.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, ...modifiers }))
}

afterEach(() => {
  while (registered.length) registered.pop()()
  document.body.innerHTML = ''
})

describe('Key.parse', () => {
  it('reads a named code as a code and a single char as a key', () => {
    expect(Key.parse('KeyA')).toMatchObject({ code: 'KeyA', isCode: true })
    expect(Key.parse('a')).toMatchObject({ code: 'a', isCode: false })
  })

  it('expands the short modifiers', () => {
    expect(Key.parse('+KeyA')).toMatchObject({ shiftKey: true })
    expect(Key.parse('^KeyA')).toMatchObject({ ctrlKey: true })
    expect(Key.parse('#KeyA')).toMatchObject({ altKey: true })
    expect(Key.parse('@KeyA')).toMatchObject({ metaKey: true })
    expect(Key.parse(':KeyA')).toMatchObject({ inInput: false })
  })

  it('accepts the unicode aliases', () => {
    expect(Key.parse('↑')).toMatchObject({ code: 'ArrowUp' })
    expect(Key.parse('⎋')).toMatchObject({ code: 'Escape' })
    expect(Key.parse('⌘KeyF')).toMatchObject({ code: 'KeyF', metaKey: true })
  })

  it('defaults to keyup, but to keydown once meta or control is involved', () => {
    expect(Key.parse('KeyA').type).toBe('keyup')
    expect(Key.parse('Control KeyA').type).toBe('keydown')
    expect(Key.parse('Meta KeyA').type).toBe('keydown')
  })

  it('takes an explicit event type', () => {
    expect(Key.parse('KeyA Down').type).toBe('keydown')
  })

  it('refuses an empty definition', () => {
    expect(() => Key.parse('   ')).toThrow()
  })
})

describe('KeySequence.parse', () => {
  it('splits a comma separated sequence', () => {
    expect(KeySequence.parse('KeyA,KeyB,KeyC').keyCount).toBe(3)
  })

  it('reads the sequence level flags without leaking them into the keys', () => {
    const preventing = KeySequence.parse('!⌘KeyF')
    expect(preventing.preventDefault).toBe(true)
    expect(preventing.keys[0]).toMatchObject({ code: 'KeyF', metaKey: true })

    const macOnly = KeySequence.parse('only-mac KeyA')
    expect(macOnly.onSystem).toBe('mac')
    expect(macOnly.keys[0].code).toBe('KeyA')
  })

  it('names the offending key when a definition is broken', () => {
    expect(() => KeySequence.parse('KeyA,,KeyB')).toThrow(/#1/)
  })
})

describe('matching', () => {
  it('triggers a single key', () => {
    const reaction = vi.fn()
    watching('KeyA', reaction)

    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('requires the modifiers to match exactly', () => {
    const reaction = vi.fn()
    watching('KeyA', reaction)

    press('KeyA', { shiftKey: true })

    expect(reaction).not.toHaveBeenCalled()
  })

  it('triggers a modified key only with that modifier', () => {
    const reaction = vi.fn()
    watching('Control KeyS', reaction)

    press('KeyS', { type: 'keydown' })
    expect(reaction).not.toHaveBeenCalled()

    press('KeyS', { type: 'keydown', ctrlKey: true })
    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('triggers a sequence only when it is completed in order', () => {
    const reaction = vi.fn()
    watching('KeyA,KeyB', reaction)

    press('KeyB')
    press('KeyA')
    expect(reaction).not.toHaveBeenCalled()

    press('KeyB')
    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('does not let a modifier key break a sequence', () => {
    const reaction = vi.fn()
    watching('KeyA,KeyB', reaction)

    press('KeyA')
    press('ShiftLeft', { key: 'Shift' })
    press('KeyB')

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('skips a NoInput key while an input element is focused', () => {
    const reaction = vi.fn()
    watching(':KeyA', reaction)

    const input = document.createElement('input')
    document.body.appendChild(input)

    press('KeyA', { target: input })
    expect(reaction).not.toHaveBeenCalled()

    press('KeyA')
    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('hands the event and the matched sequence to the reaction', () => {
    const reaction = vi.fn()
    watching('KeyA', reaction)

    press('KeyA')

    const [event, sequence] = reaction.mock.calls[0]
    expect(event.code).toBe('KeyA')
    expect(sequence).toBeInstanceOf(KeySequence)
  })
})

describe('unwatching', () => {
  it('stops reacting after the disposer ran', () => {
    const reaction = vi.fn()
    const dispose = watch('KeyA', reaction)

    press('KeyA')
    dispose()
    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('disposes everything registered under one reference', () => {
    const reaction = vi.fn()
    const reference = {}
    watch('KeyA', reaction, reference)
    watch('KeyB', reaction, reference)

    press('KeyA')
    unwatchAll(reference)
    press('KeyB')

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('scopes watchers through of()', () => {
    const reaction = vi.fn()
    const scope = of({})
    scope.watch('KeyA', reaction)

    press('KeyA')
    scope.unwatch()
    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
  })
})

describe('definition shapes', () => {
  it('accepts an object of handlers', () => {
    const reaction = vi.fn()
    watching({ KeyA: reaction })

    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('accepts a nested object, joining the levels', () => {
    const reaction = vi.fn()
    watching({ Control: { KeyS: reaction } })

    press('KeyS', { type: 'keydown', ctrlKey: true })

    expect(reaction).toHaveBeenCalledTimes(1)
  })

  it('accepts a function providing the definitions', () => {
    const reaction = vi.fn()
    watching(() => ({ KeyA: reaction }))

    press('KeyA')

    expect(reaction).toHaveBeenCalledTimes(1)
  })
})
