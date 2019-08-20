// UndoStack keeps track of changes as a list of complete views

import {assert} from "./util.mjs";

export class UndoStack {
  constructor() {
    this.versions = []; // a list of Views
    this.i = -1;
    this.length = 0;
    this.listeners = [];
  }
  
  _notify() {
    this.listeners.map(f => f(this));
  }
  
  get() {
    assert(0 <= this.i && this.i < this.length);
    return this.versions[this.i];
  }
  push(version) {
    this.versions.length = this.i + 1;
    this.versions.push(version);
    this.i = this.versions.length - 1;
    this.length = this.versions.length;
    this._notify();
  }
  undo() {
    if (this.i > 0) {
      this.i--;
      this._notify();
    }
  }
  redo() {
    if (this.i + 1 < this.versions.length) {
      this.i++;
      this._notify();
    }
  }
}
