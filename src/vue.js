/**
 * Vue 3 bindings for keywatch.
 *
 * Two ways to bind keys to a component, both of which dispose their watchers
 * when the component is unmounted:
 *
 * Composition API:
 *
 *   <script setup>
 *   import { watchKeys } from 'keywatch/vue'
 *
 *   watchKeys({
 *     'Control KeyS': () => save(),
 *   })
 *   </script>
 *
 * Options API:
 *
 *   mixins: [
 *     Mixin({
 *       'Control KeyS' () { this.save() },
 *     })
 *   ]
 */

import { getCurrentInstance, isRef, onUnmounted, watch as vueWatch } from 'vue'
import { isString } from './lib'
import { unfoldKeyDefinition, unwatchAll, watch, watchSequence } from './keys'

/**
 * @typedef {import('./keys').KeyProvider} KeyProvider
 */

/**
 * @typedef {import('./keys').Disposer} Disposer
 */

/**
 * Registers every key definition found in the provided KeyProvider under a reference.
 *
 * A Promise is resolved transparently: nothing is registered until it settles, and a
 * disposal that happens in the meantime keeps the late definitions from being registered
 * at all.
 *
 * @param {*}                 ref             the reference the watchers are registered under
 * @param {KeyProvider|Promise<KeyProvider>} keys the definitions to register
 * @param {*|null} [bindTo=null]              if given, every handler is bound to it
 * @return {Disposer}                         disposes everything this call registered
 */
function bindKeys (ref, keys, bindTo = null) {
  let disposers = []
  let isDisposed = false

  const register = definitions => {
    if (isDisposed) return

    disposers = definitions.flatMap(definition => {
      const handler = bindTo === null ? definition.handler : definition.handler.bind(bindTo)
      try {
        return [watchSequence(definition.sequence, handler, ref)]
      } catch (ex) {
        console.error('keywatch: failed to watch %O', definition, ex)
        return []
      }
    })
  }

  if (keys instanceof Promise) {
    keys
      .then(resolved => register(unfoldKeyDefinition(resolved)))
      .catch(ex => console.error('keywatch: failed to resolve key definitions', ex))
  } else {
    register(unfoldKeyDefinition(keys))
  }

  return () => {
    isDisposed = true
    disposers.forEach((dispose, index) => {
      try {
        dispose()
      } catch (ex) {
        console.warn('keywatch: failed to unwatch', index, ex)
      }
    })
    disposers = []
  }
}

/**
 * Watches keys for as long as the calling component is mounted.
 *
 * Accepts the same definitions as watch(), and additionally a Ref, a ComputedRef or a
 * getter function. Reactive sources are rebound whenever they change, which is the
 * Composition API counterpart to the string form of the Mixin.
 *
 * Called outside of a component there is nothing to unmount, so only the returned
 * disposer cleans up.
 *
 * @param {KeyProvider|import('vue').Ref<KeyProvider>|function(): KeyProvider} keys
 * @param {*} [ref=null] a reference for removal, defaults to the current component instance
 * @return {Disposer}    disposes every watcher this call registered
 */
export function watchKeys (keys, ref = null) {
  const instance = getCurrentInstance()
  const owner = ref || instance || {}

  let dispose = () => {}
  const release = () => {
    dispose()
    dispose = () => {}
  }

  if (!isRef(keys) && typeof keys !== 'function') {
    dispose = bindKeys(owner, keys)
    if (instance) onUnmounted(release)
    return release
  }

  const stop = vueWatch(keys, next => {
    release()
    if (next) dispose = bindKeys(owner, next)
  }, { immediate: true })

  const disposeReactive = () => {
    stop()
    release()
  }

  if (instance) onUnmounted(disposeReactive)

  return disposeReactive
}

/**
 * Vue 3 mixin that watches keys while the component is mounted.
 *
 * Passing a string does not define a key: it names a reactive property or computed on the
 * component that provides the definitions, and the watchers are rebuilt whenever it changes.
 *
 * @param {KeyProvider|string|null} [keys=null] the definitions, or the name of a property holding them
 * @return {import('vue').ComponentOptions}     a mixin for the Options API
 */
export function Mixin (keys = null) {
  return {
    mounted () {
      if (!keys) {
        // it's not required to watch shortcuts here
        return
      }

      if (isString(keys)) {
        let dispose = () => {}
        const rebind = to => {
          dispose()
          dispose = to ? bindKeys(this, to, this) : () => {}
        }

        // bind once on mounting, then again whenever the property changes
        rebind(this[keys])
        this.$watch(keys, rebind)
        return
      }

      bindKeys(this, keys, this)
    },

    /**
     * Automatically unwatch all watched keys
     */
    beforeUnmount () {
      unwatchAll(this)
    },

    methods: {
      $watchKeys (keys, handler) {
        return watch(keys, handler, this)
      },
    },
  }
}
