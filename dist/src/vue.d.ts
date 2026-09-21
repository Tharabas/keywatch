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
export function watchKeys(keys: KeyProvider | import("vue").Ref<KeyProvider> | (() => KeyProvider), ref?: any): Disposer;
/**
 * Vue 3 mixin that watches keys while the component is mounted.
 *
 * Passing a string does not define a key: it names a reactive property or computed on the
 * component that provides the definitions, and the watchers are rebuilt whenever it changes.
 *
 * @param {KeyProvider|string|null} [keys=null] the definitions, or the name of a property holding them
 * @return {import('vue').ComponentOptions}     a mixin for the Options API
 */
export function Mixin(keys?: KeyProvider | string | null): import("vue").ComponentOptions;
export type KeyProvider = import("./keys").KeyProvider;
export type Disposer = import("./keys").Disposer;
