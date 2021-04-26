// kq - a knockoff jquery

export default function Q(node) {
  if (node instanceof Q) {
    return node;
  } else if (typeof node === "string") {
    return Q.query(node);
  } else if (!this || this === window) {
    return new Q(node);
  } else if (arguments.length === 0) {
    this.length = 0;
  } else if (node === null) {
    this.length = 0;
  } else if (node instanceof Element || node === window) {
    this[0] = node;
    this.length = 1;
  } else if (node instanceof NodeList) {
    this.length = node.length;
    for (let i = 0; i < node.length; i++) {
      this[i] = node[i];
    }
  } else if (node instanceof Array) {
    this.length = 0;
    for (let i = 0; i < node.length; i++) {
      if (node[i] instanceof Q) {
        for (let j = 0; j < node[i].length; j++) {
          this[this.length++] = node[i][j];
        }
      } else {
        this[this.length++] = node[i];
      }
    }
  } else if (typeof node === "function") {
    this[0] = window;
    this.length = 1;
    this.on('load', node);
  } else {
    throw new Error("Invalid argument to Q");
  }
};

Q.create = function (tagname, props) {
  /* Takes the tagname (a string), optionally an object of properties (or null), and finally a list of things to append. */
  let el = new Q(document.createElement(tagname));
  let i = 1;
  if (typeof props === "object" && !(props instanceof Q)) {
    i++;
    if (props) {
      for (let key in props) {
        el[0][key] = props[key];
      }
    }
  }
  for (; i < arguments.length; i++) {
    el.append(arguments[i]);
  }
  return el;
};
Q.textNode = function (s) {
  return new Q(document.createTextNode(s));
};
Q.withId = function (id) {
  return new Q(document.getElementById(id));
};
Q.query = function (q) {
  return new Q(document.querySelectorAll(q));
};
Q.prototype.query = function (q) {
  var list = new Q();
  var j = 0;
  for (var i = 0; i < this.length; i++) {
    this[i].querySelectorAll(q).forEach(e => {
      list[j++] = e;
    });
  }
  list.length = j;
  return list;
};
Q.prototype.forEach = function (f) {
  for (var i = 0; i < this.length; i++) {
    f(new Q(this[i]), i);
  }
};
Q.prototype.append = function (/*varargs*/) {
  for (let i = 0; i < arguments.length; i++) {
    let node = arguments[i];
    if (node instanceof Q) {
      node.appendTo(this);
    } else if (node instanceof Element) {
      this[0].appendChild(node);
    } else if (node instanceof Array) {
      node.forEach(n => this.append(n));
    } else {
      this[0].appendChild(document.createTextNode('' + node));
    }
  }
  return this;
};
Q.prototype.appendTo = function (node) {
  if (node instanceof Q) {
    node = node[0];
  }
  for (var i = 0; i < this.length; i++) {
    node.appendChild(this[i]);
  }
  return this;
};
Q.prototype.remove = function () {
  for (var i = 0; i < this.length; i++) {
    if (this[i].parentNode !== null) {
      this[i].parentNode.removeChild(this[i]);
    }
  }
  return this;
};
Q.prototype.addClass = function (cls) {
  for (var i = 0; i < this.length; i++) {
    this[i].classList.add(cls);
  }
  return this;
};
Q.prototype.removeClass = function (cls) {
  for (var i = 0; i < this.length; i++) {
    this[i].classList.remove(cls);
  }
  return this;
};
Q.prototype.toggleClass = function (cls, /*opt*/toggle) {
  for (var i = 0; i < this.length; i++) {
    if (arguments.length >= 2) {
      this[i].classList.toggle(cls, toggle);
    } else {
      this[i].classList.toggle(cls);
    }
  }
  return this;
};
Q.prototype.on = function (event, handler, useCapture) {
  var events = event.split(' ');
  for (var j = 0; j < events.length; j++) {
    if (events[j] !== '') {
      for (var i = 0; i < this.length; i++) {
        this[i].addEventListener(events[j], handler, !!useCapture);
      }
    }
  }
  return this;
};
Q.prototype.off = function (event, handler) {
  var events = event.split(' ');
  for (var j = 0; j < events.length; j++) {
    if (events[j] !== '') {
      for (var i = 0; i < this.length; i++) {
        this[i].removeEventListener(events[j], handler);
      }
    }
  }
  return this;    
};
Q.prototype.empty = function () {
  for (var i = 0; i < this.length; i++) {
    var node = this[i];
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }
  return this;
};
Q.prototype.attr = function (k, /*opt*/v) {
  if (arguments.length === 1) {
    return this[0].getAttribute(k);
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i].setAttribute(k, v);
    }
    return this;
  }
};
Q.prototype.prop = function (k, /*opt*/v) {
  if (arguments.length === 1) {
    return this[0][k];
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i][k] = v;
    }
    return this;
  }
};
Q.prototype.value = function (/*opt*/v) {
  if (arguments.length === 0) {
    return this[0].value;
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i].value = v;
    }
    return this;
  }
};
Q.prototype.css = function (k, /*opt*/v) {
  if (arguments.length === 1) {
    return this[0].style[k];
  } else {
    for (var i = 0; i < this.length; i++) {
      this[i].style[k] = v;
    }
    return this;
  }
};

function tag(tagname) {
  Q[tagname] = function () {
    return Q.create(tagname, ...arguments);
  };
}

tag('div'); tag('span');
tag('p');
tag('ol'); tag('ul'); tag('li');
tag('sup');
tag('a');
