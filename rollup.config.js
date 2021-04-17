import {terser} from 'rollup-plugin-terser';

export default {
  input: {
    main: "src/main.mjs"
  },
  output: {
    dir: "build",
    format: "cjs",
    sourcemap: true,
    plugins: [terser()]
  }
};
