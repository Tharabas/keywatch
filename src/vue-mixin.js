import { isString } from './lib'
import { unwatchAll, watch, watchSequence, unfoldKeyDefinition } from './keys'

/**
 * Internal function to handle Vue-Mixin binding for key-reactions.
 *
 * @param {Vue} instance the vue instance
 * @param {*}   keys     the defined keys to watch
 * @param {*}   options  watcher options
 * @return {(function(): void)|Promise<* | (function(): void)>}
 */
function watchKeys (instance, keys, options) {
  // when a promise is provided
  if (keys instanceof Promise) {
    return keys.then(result => watchKeys(instance, result, options))
  }
  const unwatcher = unfoldKeyDefinition(keys).flatMap(definition => {
    try {
      const dispose = watchSequence(definition.sequence, definition.handler.bind(instance), instance)
      return [dispose]
    } catch (ex) {
      console.error('Failed to watch %O', definition, err)
      return []
    }
  })
  return () => unwatcher.forEach((dispose, idx) => {
    try {
      dispose()
    } catch (err) {
      console.warn('failed to dispose', dispose, idx, err)
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
export default function (keys = null, options = {}) {
  return {
    mounted () {
      if (!keys) {
        // it's not required to watch shortcuts here
        return
      }

      // watch property / computed
      if (isString(keys)) {
        let unwatch = Promise.resolve(() => {})
        const updateWith = to => {
          unwatch.then(disposer => {
            try {
              disposer()
            } catch (ex) {
              console.warn('failed to unwatch', this, ex)
            }

            if (to) {
              unwatch = watchKeys(this, to, options)
              if (!(unwatch instanceof Promise)) {
                unwatch = Promise.resolve(unwatch)
              }
            } else {
              unwatch = Promise.resolve(() => {})
            }
          })
        }
        // run once on mounting
        updateWith(this[keys])
        // run again when the data changes
        this.$watch(keys, updateWith)
        return
      }

      watchKeys(this, keys, options)
    },
    /**
     * Automatically unwatch all watched keys
     */
    beforeDestroy () {
      unwatchAll(this)
    },
    methods: {
      $watchKeys (keys, handler) {
        return watch(keys, handler, this)
      },
    }
  }
}
