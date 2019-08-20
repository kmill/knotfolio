// View for image import

import {assert, clamp} from "./util.mjs";
import Q from "./kq.mjs";
import {KnotRasterView} from "./KnotRasterView.mjs";

let global_tool_state = {
  tool: "crop"
};


export class KnotImageImportView {
  constructor(width, height, img) {
    this.img = img;
    this.width = width;
    this.height = height;

    // displacement
    this.x = 0;
    this.y = 0;

    this.scale = Math.min(1, Math.min(width / img.width, height / img.height));

    // crop region
    this.sx = 0;
    this.sy = 0;
    this.swidth = img.width;
    this.sheight = img.height;

    this.invert = false;
    this.blur = 0;
    this.threshold = 0.5;

    this.tmp_canvas = document.createElement("canvas");
    this.tmp_canvas.width = this.width;
    this.tmp_canvas.height = this.height;
    this.tmp_ctxt = this.tmp_canvas.getContext("2d");

    this.mode_name = "Image importing";
  }

  copy() {
    let view = new KnotImageImportView(this.width, this.height, this.img);
    view.x = this.x;
    view.y = this.y;
    view.scale = this.scale;
    view.sx = this.sx;
    view.sy = this.sy;
    view.swidth = this.swidth;
    view.sheight = this.sheight;
    view.invert = this.invert;
    view.blur = this.blur;
    view.threshold = this.threshold;
    return view;
  }

  update_crop(pt1, pt2) {
    let x1 = clamp(Math.min(pt1.x - this.x, pt2.x - this.x) / this.scale, 0, this.img.width),
        x2 = clamp(Math.max(pt1.x - this.x, pt2.x - this.x) / this.scale, 0, this.img.width),
        y1 = clamp(Math.min(pt1.y - this.y, pt2.y - this.y) / this.scale, 0, this.img.height),
        y2 = clamp(Math.max(pt1.y - this.y, pt2.y - this.y) / this.scale, 0, this.img.height);

    this.sx = x1;
    this.sy = y1;
    this.swidth = x2 - x1;
    this.sheight = y2 - y1;
  }

  mousedown(pt, e, undo_stack, ctxt) {
    let tool = global_tool_state.tool;
    if (tool === "crop") {
      this.crop_start = pt;
      this.update_crop(this.crop_start, pt);
      this.paint(ctxt);
    } else if (tool === "move") {
      this.move_start = pt;
    }
  }
  mousemove(pt, e, undo_stack, ctxt) {
    let tool = global_tool_state.tool;
    if (tool === "crop") {
      if (this.crop_start) {
        this.update_crop(this.crop_start, pt);
        this.paint(ctxt);
      }
    } else if (tool === "move") {
      if (this.move_start) {
        this.x += (pt.x - this.move_start.x);
        this.y += (pt.y - this.move_start.y);
        this.move_start = pt;
        this.paint(ctxt);
      }
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    let tool = global_tool_state.tool;
    if (tool === "crop") {
      if (this.crop_start) {
        this.update_crop(this.crop_start, pt);
        this.crop_start = null;
        this.paint(ctxt);
      }
    } else if (tool === "move") {
      if (this.move_start) {
        this.move_start = null;
        this.paint(ctxt);
      }
    }
  }
  toolbox(undo_stack, ctxt) {
    let $div = this.$div = Q.div();

    $div.append(
      Q.div(
        Q.span({"data-tool": "move",
                title: "Move image",
                className: "icon-button"},
               "\u219d"),
        Q.span({"data-tool": "crop",
                title: "Crop image",
                className: "icon-button"},
               "\u21f2"),
      )
        .on("click", e => {
          let el = e.target.closest('.icon-button');
          if (el) {
            let tool = Q(el).prop('data-tool');
            if (typeof tool === "string") {
              e.preventDefault();
              e.stopPropagation();
              global_tool_state.tool = tool;
              this.update_tool(tool);
            }
          }
        })
    );

    this.update_tool = (toolname) => {
      $div.query(".icon-button").forEach($e => {
        let button_tool = $e.prop("data-tool");
        if (typeof button_tool === "string") {
          $e.toggleClass("active", button_tool === toolname);
        }
      });
    };
    this.update_tool(global_tool_state.tool);

    $div.append(
      Q.create("label", {title: "Rescale the image"},
               "Scale: ",
               Q.create("input", { type: "range",
                                   min: "1",
                                   max: "300",
                                   step: "1",
                                   className: "slider" })
               .value(Math.floor(this.scale * 100))
               .on("input", e => {
                 let newScale = e.target.value / 100;
                 this.scale = newScale;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", { title: "Invert the values of all the colors, for example if this is a chalk drawing." },
               "Invert colors: ",
               Q.create("input", {type: "checkbox"})
               .on("input", e => {
                 this.invert = e.target.checked;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Blur radius"},
               "Blur: ",
               Q.create("input", { type: "range",
                                   min: "0",
                                   max: "4",
                                   step: "1",
                                   className: "slider" })
               .value(this.blur)
               .on("input", e => {
                 this.blur = e.target.value;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Threshold for black"},
               "Threshold: ",
               Q.create("input", {type: "range",
                                  min: "0",
                                  max: "1000",
                                  step: "1",
                                  className: "slider"})
               .value(Math.floor(this.threshold * 1000))
               .on("input", e => {
                 this.threshold = e.target.value / 1000;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("input", {type: "button",
                         value: "Accept",
                         title: "Take selection to painting mode"})
        .on("click", e => {
          this.paint(ctxt, true);
          let view = new KnotRasterView(this.width, this.height);
          view.fromImage(ctxt.getImageData(0, 0, this.width, this.height));
          undo_stack.push(view);
        })
    );

    return $div;
  }

  paint(ctxt, onlyCropped=false) {
    ctxt.save();
    if (onlyCropped) {
      ctxt.fillStyle = "#fff";
    } else {
      ctxt.fillStyle = "#ddd";
    }
    ctxt.fillRect(0, 0, this.width, this.height);

    let rx = this.sx*this.scale+this.x,
        ry = this.sy*this.scale+this.y,
        rwidth = this.swidth*this.scale,
        rheight = this.sheight*this.scale;

    if (!onlyCropped) {
      ctxt.globalAlpha = 0.3;
      ctxt.drawImage(this.img,
                     0, 0, this.img.width, this.img.height,
                     this.x, this.y, this.scale*this.img.width, this.scale*this.img.height);

      ctxt.globalAlpha = 1.0;
      ctxt.fillStyle = "#fff";
      ctxt.fillRect(rx, ry, rwidth, rheight);
    }

    let tmp_ctxt = this.tmp_ctxt;
    tmp_ctxt.fillStyle = "#fff";
    tmp_ctxt.fillRect(0, 0, rwidth + 1, rheight + 1);

    tmp_ctxt.drawImage(this.img,
                       this.sx, this.sy, this.swidth, this.sheight,
                       0, 0, rwidth, rheight);

    let imgdata = tmp_ctxt.getImageData(0, 0, Math.max(1, Math.floor(rwidth)), Math.max(1, Math.floor(rheight)));
    let data = imgdata.data;

    // make grayscale (put everything into channel 1)
    let do_invert = this.invert;
    for (let i = 0; i < data.length; i += 4) {
      let c = (data[i] + data[i+1] + data[i+2])/3;
      if (do_invert) {
        c = 255 - c;
      }
      data[i] = c;
    }

    // blur this.blur times
    let width = imgdata.width;
    let height = imgdata.height;
    let buf = new Uint8Array(width*height);
    for (let time = 0; time < this.blur; time++) {
      // approximate 3x3 Gaussian blur into buf
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) {
            let y2 = clamp(y + dy, 0, height-1);
            for (let dx = -1; dx <= 1; dx++) {
              let x2 = clamp(x + dx, 0, width-1);
              let i = Math.abs(dx) + Math.abs(dy);
              let k = 1;
              if (i === 0) {
                k = 4;
              } else if (i === 1) {
                k = 2;
              }
              sum += data[4*(width*y2 + x2)] * k;
            }
          }
          buf[width*y+x] = sum / 16;
        }
      }
      // copy buf to data
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          data[4*(width*y + x)] = buf[width*y+x];
        }
      }
    }

    // threshold
    for (let i = 0; i < data.length; i += 4) {
      let c = data[i];
      c = (c/255 <= this.threshold) ? 0 : 255;
      data[i] = data[i+1] = data[i+2] = c;
      data[i+3] = 255;
    }

    ctxt.putImageData(imgdata, rx, ry);

    ctxt.restore();
  }
}
