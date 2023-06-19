import {assert} from "./util.mjs";
import "./jones.mjs";
import "./alexander.mjs";
import "./conway.mjs";
import "./identify.mjs";
import {KnotImageImportView} from "./KnotImageImportView.mjs";
import {KnotRasterView} from "./KnotRasterView.mjs";
import {UndoStack} from "./undostack.mjs";
import {WIDTH, HEIGHT} from "./constants.mjs";
import {Point} from "./geom2d.mjs";
import Q from "./kq.mjs";

Q(function () {
  window.addEventListener('error', function (e) {
    let close = Q.create("input", {type:"button", className:"program-error-close"}).value("X");
    let $box = Q.create("div", {className:"program-error"},
                        close,
                        Q.create("h1", "Unhandled error"),
                        Q.create("p", "Message: " + e.message),
                        Q.create("p", "in " + e.filename + ":" + e.lineno + ":" + e.colno),
                        Q.create("p", "Error object: " + JSON.stringify(e.error)));
    Q("body").append($box);
    close.on("click", e => $box.remove());
  });

  var undo_stack = new UndoStack();

  undo_stack.listeners.push(undo_stack => {
    Q(".undo-state").empty().append(`${undo_stack.i + 1}/${undo_stack.length}`);
    Q("input.action-undo").prop("disabled", undo_stack.i <= 0);
    Q("input.action-redo").prop("disabled", undo_stack.i + 1 >= undo_stack.length);
  });
  Q("input.action-undo").on("click", () => {
    undo_stack.undo();
  });
  Q("input.action-redo").on("click", () => {
    undo_stack.redo();
  });
  Q("input.action-clear").on("click", () => {
    undo_stack.push(new KnotRasterView(WIDTH, HEIGHT));
  });

  var canvas = Q.create("canvas").appendTo(Q("#editor"));
  canvas.prop("width", WIDTH);
  canvas.prop("height", HEIGHT);

  var ctxt = canvas[0].getContext('2d', {willReadFrequently: true});
  undo_stack.listeners.push(undo_stack => {
    Q(".modename").empty().append(undo_stack.get().mode_name);
    undo_stack.get().paint(ctxt);

    let $tools = Q("#tools").empty();
    $tools.append(undo_stack.get().toolbox(undo_stack, ctxt));
  });

  undo_stack.push(new KnotRasterView(WIDTH, HEIGHT));

  function mousePos(e) {
    let rect = canvas[0].getBoundingClientRect();
    return new Point(Math.floor(e.clientX - rect.left-1), Math.floor(e.clientY - rect.top-1));
  }

  var color = null;
  var mouseHandler = null;

  canvas.on("mousedown", function (e) {
    e.preventDefault();
    e.stopPropagation();
    undo_stack.get().mousedown(mousePos(e), e, undo_stack, ctxt);
  });
  canvas.on("mousemove", function (e) {
    e.preventDefault();
    e.stopPropagation();
    undo_stack.get().mousemove(mousePos(e), e, undo_stack, ctxt);
  });
  canvas.on("mouseup", function (e) {
    e.preventDefault();
    e.stopPropagation();
    undo_stack.get().mouseup(mousePos(e), e, undo_stack, ctxt);
  });
  canvas.on("contextmenu", function (e) {
    e.preventDefault();
  });
  canvas.on("wheel", function (e) {
    e.preventDefault();
    e.stopPropagation();
    let view = undo_stack.get();
    if (view.mousewheel) {
      view.mousewheel(mousePos(e), e, undo_stack, ctxt);
    }
  });

  canvas.on("touchstart", function (e) {
    if (e.touches.length > 1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.button = 0;
    e.buttons = 1;
    undo_stack.get().mousedown(mousePos(e.changedTouches[0]), e, undo_stack, ctxt);
  });
  canvas.on("touchmove", function (e) {
    if (e.touches.length > 1) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.button = 0;
    e.buttons = 1;
    undo_stack.get().mousemove(mousePos(e.changedTouches[0]), e, undo_stack, ctxt);
  });
  canvas.on("touchend", function (e) {
    if (e.touches.length > 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.button = 0;
    e.buttons = 0;
    undo_stack.get().mouseup(mousePos(e.changedTouches[0]), e, undo_stack, ctxt);
  });


  function process_img_upload() {
    let img = this;
    undo_stack.push(new KnotImageImportView(WIDTH, HEIGHT, img));
  }

  function show_drop_area(shown) {
    Q("#drop-area").css("display", shown ? "block" : "none");
  }

  let drag_enter_counter = 0;
  document.addEventListener("dragenter", e => {
    e.preventDefault();
    e.stopPropagation();
    drag_enter_counter++;
    show_drop_area(drag_enter_counter > 0);
  }, true);
  document.addEventListener("dragleave", e => {
    e.preventDefault();
    e.stopPropagation();
    drag_enter_counter--;
    show_drop_area(drag_enter_counter > 0);
  }, true);
  document.addEventListener("dragover", e => {
    e.preventDefault();
    e.stopPropagation();
    show_drop_area(true);
  }, true);
  document.addEventListener("drop", e => {
    e.preventDefault();
    e.stopPropagation();
    drag_enter_counter = 0;
    show_drop_area(false);

    let uri = e.dataTransfer.getData('text/uri-list');
    if (uri) {
      let uris = uri.split("\n");
      for (let i = 0; i < uris.length; i++) {
        if (uris[i][0] !== "#") {
          let img = document.createElement("img");
          img.crossOrigin = "Anonymous"; // just in case the site allows it (CORS prevents most things)
          img.onload = process_img_upload;
          img.src = uris[i];
          return;
        }
      }
    }

    let files = e.dataTransfer.files;
    if (files.length > 0) {
      let file = files[0];
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        let img = document.createElement("img");
        img.onload = process_img_upload;
        img.src = reader.result;
      };
      return;
    }
  }, true);

  document.addEventListener('paste', e => {
    let items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        let file = items[i].getAsFile();
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          let img = document.createElement("img");
          img.onload = process_img_upload;
          img.src = reader.result;
        };
        return;
      }
    }
  }, false);
});
