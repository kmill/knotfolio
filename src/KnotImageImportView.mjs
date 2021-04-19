// View for image import

import {assert, clamp} from "./util.mjs";
import Q from "./kq.mjs";
import {KnotRasterView} from "./KnotRasterView.mjs";
import {Point} from "./geom2d.mjs";
import {stackBlurRGB} from "./StackBlur.mjs";

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
    this.adaptive = 20;
    this.threshold = 0.00;

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
    if (e.button === 2) {
      tool = "move";
      if (this.update_tool) {
        this.update_tool(tool);
      }
    }

    if (tool === "crop") {
      this.crop_start = pt;
      this.update_crop(this.crop_start, pt);
      this.paint(ctxt);
    } else if (tool === "move") {
      this.move_start = pt;
    }
  }
  mousemove(pt, e, undo_stack, ctxt) {
    if (!e.buttons) {
      this.mouseup(pt, e, undo_stack, ctxt);
      return;
    }
    if (this.crop_start) {
      this.update_crop(this.crop_start, pt);
      this.paint(ctxt);
    } else if (this.move_start) {
      this.x += (pt.x - this.move_start.x);
      this.y += (pt.y - this.move_start.y);
      this.move_start = pt;
      this.paint(ctxt);
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    if (this.crop_start) {
      this.update_crop(this.crop_start, pt);
      this.crop_start = null;
      this.paint(ctxt);
    } else if (this.move_start) {
      this.move_start = null;
      this.paint(ctxt);
    }
    this.update_tool(global_tool_state.tool);
  }
  mouse_to_pt(pt) {
    assert(pt instanceof Point);
    return new Point((pt.x - this.x)/this.scale,
                     (pt.y - this.y)/this.scale);
  }
  mousewheel(pt, e, undo_stack, ctxt) {
    let delta = Math.sign(e.deltaY);
    let kpt = this.mouse_to_pt(pt);
    this.set_scale(this.scale * Math.pow(1.05, -delta));
    let zkpt = this.mouse_to_pt(pt);
    this.x += this.scale*(zkpt.x - kpt.x);
    this.y += this.scale*(zkpt.y - kpt.y);
    this.paint(ctxt);
  }
  toolbox(undo_stack, ctxt) {
    let $div = this.$div = Q.div();

    $div.append(
      Q.div(
        Q.span({"data-tool": "move",
                title: "Move image [right click]",
                className: "icon-button"},
               Q.create("span", {className: "icon24-move"})),
        Q.span({"data-tool": "crop",
                title: "Crop image",
                className: "icon-button"},
               Q.create("span", {className: "icon24-crop"})),
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

    var $scale;
    $div.append(
      Q.create("label", {title: "Rescale the image [mouse wheel]"},
               "Scale: ",
               $scale = Q.create("input", { type: "range",
                                            min: "1",
                                            max: "300",
                                            step: "1",
                                            className: "slider" })
              ));
    $scale.on("input", e => {
      this.set_scale(e.target.value / 100);
      this.paint(ctxt);
    });

    this.set_scale = (new_scale) => {
      new_scale = clamp(new_scale, 0.01, 3.0);
      $scale.value(Math.floor(this.scale * 100));
      this.scale = new_scale;
    };
    this.set_scale(this.scale);

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
                                   max: "10",
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
      Q.create("label", {title: "Adaptive radius"},
               "Adaptive radius: ",
               Q.create("input", { type: "range",
                                   min: "1",
                                   max: "40",
                                   step: "1",
                                   className: "slider" })
               .value(this.adaptive)
               .on("input", e => {
                 this.adaptive = e.target.value;
                 this.paint(ctxt);
               })
              ));

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Threshold for black"},
               "Threshold: ",
               Q.create("input", {type: "range",
                                  min: "-500",
                                  max: "500",
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
    let sx = this.sx,
        sy = this.sy,
        swidth = this.swidth,
        sheight = this.sheight;

    if (rx < 0) {
      swidth += (rx) / this.scale;
      sx = (0 - this.x) / this.scale;
      rwidth += rx;
      rx = 0;
    }
    if (rwidth > this.width) {
      swidth -= (rwidth - this.width) / this.scale;
      rwidth = this.width;
    }
    if (ry < 0) {
      sheight += (ry) / this.scale;
      sy = (0 - this.y) / this.scale;
      rheight += ry;
      ry = 0;
    }
    if (rheight > this.height) {
      sheight -= (rheight - this.height) / this.scale;
      rheight = this.height;
    }


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
                       sx, sy, swidth, sheight,
                       0, 0, rwidth, rheight);

    let imgdata = tmp_ctxt.getImageData(0, 0, Math.max(1, Math.floor(rwidth)), Math.max(1, Math.floor(rheight)));
    let data = imgdata.data;

    let width = imgdata.width;
    let height = imgdata.height;

    stackBlurRGB(data, width, height, this.blur);

    let gdata = new Uint8Array(width * height);

    // make grayscale (put everything into channel 1)
    let do_invert = this.invert;
    for (let i = 0; i < gdata.length; i++) {
      let c = (data[4*i] + data[4*i+1] + data[4*i+2])/3;
      if (do_invert) {
        c = 255 - c;
      }
      gdata[i] = c;
    }

    stackBlurRGB(data, width, height, this.adaptive);

    // threshold
    for (let i = 0; i < gdata.length; i++) {
      let adapt = (data[4*i] + data[4*i+1] + data[4*i+2])/3;
      let c = gdata[i] - adapt;
      c = (c/255 <= this.threshold) ? 0 : 255;
      gdata[i] = c;
    }

    for (let i = 0; i < gdata.length; i++) {
      let c = gdata[i];
      data[4*i] = data[4*i+1] = data[4*i+2] = c;
      data[4*i+3] = 255;
    }

    ctxt.putImageData(imgdata, rx, ry);

    ctxt.restore();
  }
}
