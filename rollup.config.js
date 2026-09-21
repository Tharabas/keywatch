import { terser } from 'rollup-plugin-terser'

/**
 * The core bundles carry no dependencies at all, the vue bundles keep 'vue' external so
 * that consumers use their own copy - in the browser that is the global Vue.
 */
export default [{
  input: 'index.js',
  output: [{
    file: 'dist/esm.js',
    format: 'esm',
  }, {
    file: 'dist/esm.min.js',
    format: 'esm',
    plugins: [terser()],
  }, {
    file: 'dist/iife.js',
    format: 'iife',
    name: 'Keywatch',
  }, {
    file: 'dist/iife.min.js',
    format: 'iife',
    name: 'Keywatch',
    plugins: [terser()],
  }],
}, {
  input: 'vue.js',
  external: ['vue'],
  output: [{
    file: 'dist/vue.esm.js',
    format: 'esm',
  }, {
    file: 'dist/vue.esm.min.js',
    format: 'esm',
    plugins: [terser()],
  }, {
    file: 'dist/vue.iife.js',
    format: 'iife',
    name: 'KeywatchVue',
    globals: { vue: 'Vue' },
  }, {
    file: 'dist/vue.iife.min.js',
    format: 'iife',
    name: 'KeywatchVue',
    globals: { vue: 'Vue' },
    plugins: [terser()],
  }],
}]
