/**
 * Type smoke test.
 *
 * The declarations are generated from JSDoc, which means a malformed or missing comment
 * silently degrades a signature to `any` instead of breaking the build. This file is
 * checked with `tsc --noEmit` against the emitted .d.ts, so that such a degradation shows
 * up as a failing check rather than as a worse editor experience for everyone.
 */

import { Key, KeySequence, of, unwatchAll, watch } from 'keywatch'
import { Mixin, watchKeys } from 'keywatch/vue'
import { computed, ref } from 'vue'

// watch() accepts every documented definition shape and returns a disposer
const disposeSingle: () => unknown = watch('^s', () => {})
watch(['KeyA', 'KeyB'], () => {})
watch({ KeyA: () => {} }, null)
watch({ Control: { KeyS: () => {} } }, null)
watch(() => ({ KeyA: () => {} }), null)
watch('KeyA', () => {}, { some: 'reference' })
disposeSingle()

// the reaction is handed a KeyboardEvent and the matched sequence
watch('KeyA', (event, sequence) => {
  const code: string = event.code
  const keys: number = sequence.keyCount
  return [code, keys]
})

// classes
const key: Key = Key.parse('Control KeyS')
const matchesKey: boolean = key.matches(new KeyboardEvent('keydown'))
const shortened: string = key.toString(true)

const sequence: KeySequence = KeySequence.parse('KeyA,KeyB')
const keyCount: number = sequence.keyCount
const matchesSequence: boolean = sequence.matches([new KeyboardEvent('keyup')])

// scoped helper
const reference = {}
const scope = of(reference)
scope.watch('KeyA', () => {})
scope.unwatch()
unwatchAll(reference)

// vue entry: plain, ref and getter sources, all returning a disposer
const disposePlain: () => unknown = watchKeys({ KeyA: () => {} })
watchKeys(ref({ KeyA: () => {} }))
watchKeys(computed(() => ({ KeyA: () => {} })))
watchKeys(() => ({ KeyA: () => {} }))
watchKeys({ KeyA: () => {} }, reference)
disposePlain()

// the mixin takes definitions or the name of a property holding them
Mixin({ KeyA: () => {} })
Mixin('keys')
Mixin()

export { matchesKey, shortened, keyCount, matchesSequence }
