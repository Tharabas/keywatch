/**
 * Vue 3 entry point.
 *
 * Kept apart from the core entry so that keywatch itself stays free of any framework
 * dependency: only this bundle imports from 'vue'.
 *
 *   import { watchKeys, Mixin } from 'keywatch/vue'
 */

export { Mixin, watchKeys } from './src/vue'
