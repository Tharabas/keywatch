import { isObject, isString } from './lib'
import { unwatchAll, watch } from './keys'

function watchKeys (instance, keys, options) {
  if (instance instanceof Promise) {
    return instance.then(result => watchKeys(instance, result, options))
  }

  if (isObject(keys)) {
    keys = Object.keys(keys).map((key) => {
      return { key, handler: keys[key] }
    })
  }

  if (!Array.isArray(keys)) {
    throw new Error(`shortcuts should be defined as an array!`)
  }

  // parse shortcuts
  const unwatcher = []
  for (const definition of keys) {
    const definitionKeys = definition.keys || definition.key
    let reaction = definition.handler
    if (isString(reaction)) {
      if (this.hasOwnProperty(reaction)) {
        reaction = instance[reaction]
      } else {
        console.warn(`skipped binding %O to undefined method '%O' on %O`, definitionKeys, reaction, instance)
        continue
      }
    }
    const dispose = watch(definitionKeys, reaction.bind(instance), instance)
    unwatcher.push(dispose)
  }
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
        let unwatch = null
        const updateWith = to => {
          if (unwatch) try {
            unwatch()
          } catch (ex) {
            console.warn('failed to unwatch', this, ex)
          }

          if (to) {
            unwatch = watchKeys(this, to, options)
          } else {
            unwatch = null
          }
        }
        updateWith(this[keys])
        this.$watch(keys, updateWith)
        return
      }

      // use a one-shot version, probably an object or object provider
      if (typeof keys === 'function') {
        watchKeys(this, keys.call(this), options)
      } else {
        watchKeys(this, keys, options)
      }
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
