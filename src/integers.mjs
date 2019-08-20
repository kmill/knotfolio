import {assert} from "./util.mjs";

export const Integers = {
  zero: 0,
  unit: 1,
  add: (a, b) => a + b,
  mul: (a, b) => a * b,
  negate: a => -a
};

export function gcd(a, b) {
  /* Calculates the greatest common divisor of the two arguments. */
  assert(a === (0|a));
  assert(b === (b|b));
  a = Math.abs(a);
  b = Math.abs(b);
  if (a < b) {
    [a, b] = [b, a];
  }
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
