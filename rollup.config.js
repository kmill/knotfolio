import {terser} from 'rollup-plugin-terser';

export default {
  input: "src/main.mjs",
  output: {
    file: "bundle.js",
    format: "cjs",
    plugins: [terser()]
  }
};
