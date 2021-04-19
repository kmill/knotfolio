// Knot invariant caches
//
// Since many invariants take some computational power to compute,
// this is a system for asynchronously computing invariants and
// memoizing the results.

import {assert, toString, remove_value} from "./util.mjs";

let invariant_caches = new WeakMap;

let invariant_handlers = {};

let running_mts = [];

export function get_invariant(name, diagram, /*args*/) {
  /* Returns a promise.  The extra arguments should be toString-able.
     Technically, diagram can be any object, but it ought to be a
     KnotGraph or a PD. */

  assert(name in invariant_handlers);

  let args = Array.prototype.slice.call(arguments, 2);
  let key = name + toString(args);

  let cache = invariant_caches.get(diagram);
  if (cache && cache[key]) {
    return cache[key];
  }
  if (!cache) {
    cache = {};
    invariant_caches.set(diagram, cache);
  }
  let mt = {
    _canceled: false,
    cancel: () => { mt._canceled = true; },
    next_turn: () => new Promise((resolve, reject) => {
      if (mt._canceled) {
        reject("canceled");
      } else {
        setTimeout(resolve, 0);
      }
    })
  };
  running_mts.push(mt);
                                
  let promise = new Promise((resolve, reject) => {
    setTimeout(async function () {
      try {
        let val = invariant_handlers[name](mt, diagram, ...args);
        resolve(val);
      } catch (x) {
        reject(x);
      } finally {
        remove_value(running_mts, mt);
      }
    }, 0);
  });
  cache[key] = promise;

  return promise;
}

export function cancel_invariants() {
  /* Cancel ongoing calculations. */
  running_mts.slice().forEach(mt => mt.cancel());
}

export function define_invariant(name, f) {
  /* f is a function (mt, diagram, ...args) -> Promise, where mt is
     the "multitasking system", which has two functions next_turn()
     (which the function can await for doing cooperative multitasking)
     and cancel().  */
  assert(!invariant_handlers[name]);
  invariant_handlers[name] = f;
}
