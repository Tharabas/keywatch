import { terser } from 'rollup-plugin-terser'

export default {
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
}
