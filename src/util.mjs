export function assert(b) {
  /* Asserts that the argument is true. */
  if (!b) {
    debugger;
    throw new Error("assertion failed");
  }
}
export function assert_fails(f) {
  try {
    f();
  } catch (x) {
    return;
  }
  debugger;
  throw new Error("assertion failed");
}

export function test(name, f) {
  try {
    f();
  } catch (x) {
    console.error("FAILED: " + name);
    throw x;
  }
  console.log("passed: " + name);
}

export async function test_async(name, f) {
  try {
    await f();
  } catch (x) {
    console.error("FAILED: " + name);
    if (x.stack) {
      console.error(x.stack);
    }
    process.exit(1);
  }
  console.log("passed: " + name);
}

export function remove_value(list, value) {
  /* Removes the first occurance of value from the given list.
     Returns a boolean indicating whether a value was removed. */
  let idx = list.indexOf(value);
  if (idx >= 0) {
    list.splice(idx, 1);
    return true;
  } else {
    return false;
  }
}

// // Changing the prototype!
// Function.prototype.def_methods = function (source) {
//   /* Define prototype methods, copied from the source object. */
//   for (var key in source) {
//     if (Object.prototype.hasOwnProperty.call(source, key)) {
//       this.prototype[key] = source[key];
//     }
//   }
//   return this;
// };

export function equal(a, b) {
  /* A structural equality function that looks for an equals method
     on the first argument.  Handles arrays recursively, and otherwise
     falls back to ===. */
  if (typeof a === "object") {
    if (typeof b === "object") {
      if (a.equal) {
        return a.equal(b);
      }
      if (a instanceof Array) {
        if (!(b instanceof Array) || a.constructor !== b.constructor) {
          return false;
        }
        if (a.length !== b.length) {
          return false;
        }
        for (let i = 0; i < a.length; i++) {
          if (!equal(a[i], b[i])) {
            return false;
          }
        }
        return true;
      }
    }
  }
  return a === b;
}

export function compare(a, b) {
  /* Returns "a - b" for comparison purposes. Does lexicographical
  ordering for things that are instanceof Array after sorting by
  length. Requires that arguments have same type. */
  assert(typeof a === typeof b);
  if (typeof a === "object") {
    if (a.compare) {
      return a.compare(b);
    } else if (a instanceof Array) {
      assert(b instanceof Array);
      assert(a.constructor === b.constructor);
      if (a.length !== b.length) {
        return a.length - b.length;
      }
      for (let i = 0; i < a.length; i++) {
        let c = compare(a[i], b[i]);
        if (c !== 0) return c;
      }
      return 0;
    } else {
      throw new TypeError;
    }
  } else if (typeof a === "number" || typeof a === "boolean") {
    return a - b;
  } else if (typeof a === "string") {
    return a.localeCompare(b);
  } else if (typeof a === "null" || typeof a === "undefined") {
    return 0;
  } else {
    throw new Error("Unexpected type " + typeof a);
  }
}

function escapeChar(c) {
  /* Given a character, returns a string that can appear in a JavaScript string literal. */
  switch (c) {
  case "\0": return "\\0";
  case "\"": return "\\\"";
  case "\\": return "\\\\";
  case "\n": return "\\n";
  case "\r": return "\\r";
  case "\v": return "\\v";
  case "\t": return "\\t";
  case "\b": return "\\b";
  case "\f": return "\\f";
  }
  var code = c.charCodeAt(0);
  if (32 <= code && code < 127) {
    return c;
  } else if (code < 256) {
    return "\\x" + (code < 0x10 ? "0" : "") + code.toString(16).toUpperCase();
  } else {
    return "\\u" + (code < 0x1000 ? "0" : "") + code.toString(16).toUpperCase();
  }
}

export function toString(o) {
  /* Give a string representation that tries somewhat to be valid
     JavaScript code.  This is somewhat like repr in Python. */

  if (o instanceof Array && o.toString === Array.prototype.toString) {
    return "[" + o.map(toString).join(", ") + "]";
  } else if (typeof o === "object") {
    return o.toString();
  } else if (typeof o === "string") {
    let s = "'";
    for (let i = 0; i < o.length; i++) {
      s += escapeChar(o.charAt(i));
    }
    return s + "'";
  } else {
    return ''+o;
  }
}

export class SimpleType extends Array {
  /* A Mathematica-like type where the "head" is the constructor. */
  constructor() {
    /* Extremely annoyingly, the Array constructor with one argument
       means to construct an array of a particular size.  This object
       must comply.  Use the static method make instead. */
    if (arguments.length === 1) {
      super(arguments[0]);
    } else {
      super(arguments.length);
      for (let i = 0; i < arguments.length; i++) {
        this[i] = arguments[i];
      }
    }
  }
  equal(b) {
    assert(b.constructor === this.constructor);
    if (this.length !== b.length)
      return false;
    for (let i = 0; i < this.length; i++) {
      if (!equal(this[i], b[i]))
        return false;
    }
    return true;
  }
  compare(b) {
    assert(b.constructor === this.constructor);
    if (this.length !== b.length)
      return this.length - b.length;
    for (let i = 0; i < this.length; i++) {
      let c = compare(this[i], b[i]);
      if (c !== 0) return c;
    }
    return 0;
  }
  toString() {
    return this.constructor.name + ".make(" + this.map(toString).join(", ") + ")";
  }

  static make(/*args*/) {
    /* A sane constructor. */
    let o = new this(arguments.length);
    for (let i = 0; i < arguments.length; i++) {
      o[i] = arguments[i];
    }
    return o;
  }
}

export function clamp(val, lo, hi) {
  /* Clamps the value to the range [lo, hi]. */
  return Math.max(lo, Math.min(hi, val));
}

export function hex_to_rgb(h) {
  /* Takes an 0xrrggbb integer and outputs a "#rrggbb" string */
  let b = h & 0xFF;
  h = h >>> 8;
  let g = h & 0xFF;
  h = h >>> 8;
  let r = h & 0xFF;
  function s(i) {
    if (i < 16) {
      return "0" + i.toString(16);
    } else {
      return i.toString(16);
    }
  }
  return "#" + s(r) + s(g) + s(b);
}
