// View for painting knots

import {assert, clamp, hex_to_rgb} from "./util.mjs";
import {MIN_LINE_LENGTH, MAX_PPREV_DIST, ERASE_RADIUS, PAINT_RADIUS,
        PAINT_GAP, WIDTH, HEIGHT, ERROR_RADIUS, SPUR_LENGTH, MAX_GAP_LENGTH, palette} from "./constants.mjs";
import {Point, line_points, segments_intersect, segment_contains, pseudo_angle} from "./geom2d.mjs";
import {KnotGraph} from "./knotgraph.mjs";
import {KnotImageImportView} from "./KnotImageImportView.mjs";
import {KnotDiagramView} from "./KnotDiagramView.mjs";
import Q from "./kq.mjs";

let global_painting_state = {
  mode: "pencil",
  color: 1,
  go_over: 1
};

export class KnotRasterView {
  constructor(width, height) {
    assert(width > 0);
    assert(height > 0);
    this.width = width;
    this.height = height;
    this.buffer = new Int8Array(this.width * this.height);
    this.temp = new Int8Array(this.width * this.height);

    this.mode_name = "Painting"; // constant
    this.next_knot = null;
  }
  
  copy() {
    let kb = new KnotRasterView(this.width, this.height);
    kb.buffer.set(this.buffer);
    return kb;
  }

  mousedown(pt, e, undo_stack, ctxt) {
    if (e.button === 0 || e.button === 2) {
      if (this.next_knot) {
        this.mousemove(pt, e, undo_stack, ctxt);
        return;
      }
      this.next_knot = this.copy();
      if (e.button === 0) {
        if (global_painting_state.mode === "eraser") {
          this.the_color = 0;
        } else {
          this.the_color = global_painting_state.color;
        }
      } else {
        this.the_color = 0;
        if (this.mark_tool) {
          this.mark_tool("eraser");
        }
      }
      let go_over = global_painting_state.go_over * (e.shiftKey ? -1 : 1);
      this.mark_height(go_over);
      this.next_knot.draw_line(null, null, pt, this.the_color, go_over);
      this.pprev = [];
      this.pt1 = pt;
      this.paint(ctxt);
    }
  }
  mousemove(pt2, e, undo_stack, ctxt) {
    if (this.next_knot) {
      if (Point.dist(this.pt1, pt2) < MIN_LINE_LENGTH) {
        return;
      }
      let go_over = global_painting_state.go_over * (e.shiftKey ? -1 : 1);
      this.mark_height(go_over);
      this.next_knot.draw_line(this.pprev, this.pt1, pt2, this.the_color, go_over);
      this.pprev.push(this.pt1);
      this.pt1 = pt2;

      { // Keep only MAX_PPREV_DIST of pprev.
        let length = Point.dist(this.pprev[this.pprev.length-1], this.pt1);
        for (let i = 1; i + 1 < this.pprev.length; i++) {
          length += Point.dist(this.pprev[i], this.pprev[i+1]);
        }
        while (length >= MAX_PPREV_DIST && this.pprev.length > 2) {
          this.pprev.shift();
          length -= Point.dist(this.pprev[0], this.pprev[1]);
        }
      }

      this.paint(ctxt);
    }
  }
  mouseup(pt, e, undo_stack, ctxt) {
    if (this.next_knot) {
      this.mousemove(pt, e, undo_stack, ctxt);
      let knot = this.next_knot;
      this.next_knot = null;
      undo_stack.push(knot);
    }
  }
  toolbox(undo_stack) {
    let $div = this.$div = Q.div();

    /* Tools */
    $div.append(
      Q.create("div",
               Q.create("h2", "Tools"),

               Q.create("span", {"data-tool": "pencil",
                                 title: "Pencil",
                                 className: "icon-button"},
                        "\u270e"),

               Q.create("span", {"data-tool": "eraser",
                                 title: "Eraser [right click]",
                                 className: "icon-button"},
                        "\u2717")
              )
        .on("click", e => {
          let el = e.target.closest('.icon-button');
          if (el) {
            let mode = el['data-tool'];
            if (mode) {
              e.preventDefault();
              e.stopPropagation();
              global_painting_state.mode = mode;
              this.mark_tool(mode);
            }
          }
        })
    );

    this.mark_tool = function (toolname) {
      /* Set a tool button to be active, depending on the mode */

      $div.query(".icon-button").forEach($e => {
        let button_tool = $e.prop("data-tool");
        if (typeof button_tool === "string") {
          $e.toggleClass("active", button_tool === toolname);
        }
      });
    };
    this.mark_tool(global_painting_state.mode);

    /* Over/under */
    $div.append(
      Q.create("div",
               Q.create("h2").append("Pencil mode"),

               /* over */
               Q.create("span", {"data-height": 1,
                                 title: "Go over",
                                 className: "icon-button"},
                        "\u2197"),
               /* same */
               Q.create("span", {"data-height": 0,
                                 title: "Go through (no auto-gaps)",
                                 className: "icon-button"},
                        "\u2192"),
               /* under */
               Q.create("span", {"data-height": -1,
                                 title: "Go under [shift]",
                                 className: "icon-button"},
                        "\u2198"),

              )
        .on("click", e => {
          let el = e.target.closest('.icon-button');
          if (el) {
            let height = Q(el).prop("data-height");
            if (typeof height === "number") {
              e.preventDefault();
              e.stopPropagation();
              global_painting_state.go_over = height;
              this.mark_height(height);
              global_painting_state.mode = "pencil";
              this.mark_tool("pencil");
            }
          }
        })
    );

    this.mark_height = function (go_over) {
      $div.query(".icon-button").forEach($e => {
        let button_height = $e.prop("data-height");
        if (typeof button_height === "number") {
          $e.toggleClass("active", go_over === button_height);
        }
      });
    };
    this.mark_height(global_painting_state.go_over);

    { /* Colors */
      let $colors = Q.div().appendTo($div);
      $colors.append(Q.create("h2", "Pencil colors"));
      palette.forEach((hex, i) => {
        $colors.append(Q.create("span", {className: "icon-button",
                                         "data-color": i+1,
                                         title: "Color " + (i+1)},
                                Q.create("span", {className: "icon-color"})
                                .css("background", hex_to_rgb(hex))));
      });
      $colors.on("click", e => {
        let el = e.target.closest('.icon-button');
        if (el) {
          let color = Q(el).prop("data-color");
          if (color) {
            e.preventDefault();
            e.stopPropagation();
            global_painting_state.color = color;
            this.mark_color(color);
            global_painting_state.mode = "pencil";
            this.mark_tool("pencil");
          }
        }
      }, true);

      this.mark_color = function (i) {
        /* Set a color button to be active, depending on the color index i. */
        $colors.query(".icon-button").forEach(b => {
          b.toggleClass("active", b.prop("data-color") === i);
        });
      };
      this.mark_color(global_painting_state.color);
    }

    $div.append(Q.create("br"));

    $div.append(
      Q.create("label", {title: "Load an image from a file (can also drag and drop from the filesystem or sometimes copy and paste)"},
               "Load image: ",
               Q.create("input", {type: "file"})
               .on("input", e => {
                 let file = e.target.files[0];
                 if (file) {
                   let reader = new FileReader();
                   reader.readAsDataURL(file);
                   reader.onloadend = () => {
                     let img = document.createElement("img");
                     img.onload = () => {
                       undo_stack.push(new KnotImageImportView(WIDTH, HEIGHT, img));
                     };
                     img.src = reader.result;
                   };
                 }
               })
              ));

    $div.append(Q.create("hr"));

    $div.append(Q.create("input", {type: "button",
                                   title: "Find cores of curves by morphological thinning"})
                .value("Clean up")
                .on("click", e => {
                  let knot = this.copy();
                  knot.clean_up();
                  undo_stack.push(knot);
                }));

    $div.append(Q.create("br"));

    $div.append(Q.create("input", {type: "button",
                                   title: "Clear boundary pixels of curves"})
                .value("Thin")
                .on("click", e => {
                  let knot = this.copy();
                  knot.thin();
                  undo_stack.push(knot);
                }));

    $div.append(Q.create("input", {type: "button",
                                   title: "Add boundary pixels to curves"})
                .value("Thicken")
                .on("click", e => {
                  let knot = this.copy();
                  knot.thicken();
                  undo_stack.push(knot);
                }));

    $div.append(Q.create("hr"));

    $div.append(Q.create("input", {type: "button",
                                   title: "Analyze picture and convert to a diagram"})
                .value("Convert to diagram")
                .on("click", e => {
                  undo_stack.push(this.convert());
                }));

    if (this.the_error) {
      let $error = Q.div({className: "error"},
                         Q.create("h2", "Error"))
          .appendTo($div);
      if (this.the_error instanceof Array) {
        this.the_error.forEach(err => $error.append(Q.p(''+err)));
      } else {
        $error.append(Q.p(''+this.the_error));
      }
    }

    return $div;
  }

  paint(ctxt) {
    let imgdata = ctxt.getImageData(0, 0, this.width, this.height);
    this.writeImage(imgdata);
    ctxt.putImageData(imgdata, 0, 0);
  }

  writeImage(imageData) {
    /* writes the buffer */
    assert(imageData.height >= this.height);
    assert(imageData.width >= this.width);
    let data = imageData.data;
    let w = this.width,
        h = this.height;
    let buf = this.next_knot ? this.next_knot.buffer : this.buffer;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let off = w*y+x;
        let c = buf[off];
        if (c > 0) {
          let hex = palette[c-1];
          data[4*off+0] = (hex >>> 16) & 0xFF;
          data[4*off+1] = (hex >>> 8) & 0xFF;
          data[4*off+2] = hex & 0xFF;
          data[4*off+3] = 255;
        } else if (c === 0) {
          data[4*off+0] = 255;
          data[4*off+1] = 255;
          data[4*off+2] = 255;
          data[4*off+3] = 255;
        } else {
          // error color
          data[4*off+0] = 255;
          data[4*off+1] = 150;
          data[4*off+2] = 150;
          data[4*off+3] = 255;
        }
      }
    }
  }

  fromImage(imageData) {
    /* Attempts to get buffer out of the imageData. */
    assert(imageData.height >= this.height);
    assert(imageData.width >= this.width);
    let data = imageData.data;
    let w = this.width,
        h = this.height;
    let buf = this.buffer;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let off = w*y+x;
        let color = (data[4*off+0] << 16) | (data[4*off+1] << 8) | data[4*off+2];
        let idx = palette.indexOf(color);
        if (idx >= 0) {
          buf[off] = idx + 1;
        } else {
          buf[off] = 0;
        }
      }
    }
  }

  draw_line(pprev, p1, p2, v, go_over = 1) {
    /* Draw a line from p1 to p2, given that there had already been a
       line through the points in the array pprev to p1.  We allow pprev
       to be null, meaning this is a fresh start.  If pprev is null, then
       we allow p1 to be null, meaning this is the first point. */
    let buf = this.buffer;
    let temp = this.temp;

    let width = 0|this.width,
        height = 0|this.height;

    //console.log("draw_line(["+pprev+'],'+p1+','+p2+','+v+','+go_over+')');

    let getPixel = (x, y) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        return buf[y*width + x];
      } else {
        return 0;
      }
    };
    let setPixel = (x, y, v) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        buf[y*width + x] = v;
      }
    };
    let getTempPixel = (x, y) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        return temp[y*width + x];
      } else {
        return -1;
      }
    };
    let setTempPixel = (x, y, v) => {
      if (0 <= x && x < width && 0 <= y && y < height) {
        temp[y*width + x] = v;
      }
    };


    function with_radius(x, y, r, f) {
      /* Calls f with all pairs within a box of radius r of the given (x,y) point. */
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          f(x + i, y + j);
        }
      }
    }

    if (v === 0) {
      // This is erase mode
      for (let p of line_points(p1 || p2, p2)) {
        with_radius(p.x, p.y, ERASE_RADIUS, (x, y) => setPixel(x, y, 0));
      }
    } else {
      // This is draw mode

      temp.fill(-1);
      // non-negative means something to write.
      // -2 marks pre-existing stuff that won't be re-written.

      function find_existing(r, x, y) {
        if (r < 0 || getTempPixel(x, y) !== -1 || getPixel(x, y) !== v) {
          return;
        }
        setTempPixel(x, y, -2);
        with_radius(x, y, 1, (x2, y2) => find_existing(r-1, x2, y2));
      }

      p1 = p1 || p2;

      // See if this is, roughly, the start of a new line
      let p0 = null;
      if (pprev === null || pprev.length === 0) {
        p0 = p1;
      } else {
        let length = Point.dist(p1, p2);
        let last_p = p1;
        for (let i = pprev.length-1; i >= 0; i--) {
          length += Point.dist(last_p, pprev[i]);
          last_p = pprev[i];
        }
        if (length <= MAX_PPREV_DIST) {
          p0 = pprev[0];
        }
      }
      if (p0 !== null) {
        // Start of a new line, so look for anything it might be extending.
        with_radius(p0.x, p0.y, PAINT_RADIUS+1, (x, y) => find_existing(PAINT_RADIUS + PAINT_GAP, x, y));
      }

      // mark everything in the line through pprev to p1 as being part of the current line
      if (pprev !== null) {
        let last_p = p1;
        fill_old:
        for (var i = pprev.length-1; i >= 0; i--) {
          for (let p of line_points(last_p, pprev[i])) {
            if (getPixel(p.x, p.y) === -1) {
              // for go_over < 0
              break fill_old;
            }
            with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => setTempPixel(x, y, -2));
          }
          last_p = pprev[i];
        }
      }

      // detect endpoints to suppress white border when closing up
      if(0)with_radius(p2.x, p2.y, PAINT_RADIUS + PAINT_GAP, (x, y) => {
        if (getPixel(x, y) !== v || getTempPixel(x, y) !== -1) {
          return;
        }
        var state = -1;
        var changes = -1;
        function visit(x2, y2) {
          if (getTempPixel(x2, y2) === -2) {
            return;
          }
          let c = getPixel(x2, y2);
          if (c !== state) {
            state = c;
            changes++;
          }
        }
        let r = 2*PAINT_RADIUS + PAINT_GAP;
        // go in counter-clockwise square of radius r about (x,y).
        for (let x2 = x - r; x2 < x + r; x2++) {
          visit(x2, y + r);
        }
        for (let y2 = y + r; y2 > y - r; y2--) {
          visit(x + r, y2);
        }
        for (let x2 = x + r; x2 > x - r; x2--) {
          visit(x2, y - r);
        }
        for (let y2 = y - r; y2 < y + r; y2++) {
          visit(x - r, y2);
        }
        if (changes === 2) {
          find_existing(r, x, y);
        }
      });

      for (let p of line_points(p1, p2)) {
        if (go_over > 0) {
          with_radius(p.x, p.y, PAINT_RADIUS + PAINT_GAP, (x, y) => {
            if (getTempPixel(x, y) === -1) {
              setTempPixel(x, y, 0);
            }
          });
          with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => setTempPixel(x, y, v));
        } else if (go_over < 0) {
          with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => {
            let avoid = false;
            with_radius(x, y, PAINT_GAP, (x2, y2) => {
              if (getTempPixel(x2, y2) === -1 && getPixel(x2, y2) > 0) {
                avoid = true;
              }
            });
            if (!avoid) {
              setTempPixel(x, y, v);
            }
          });
        } else {
          with_radius(p.x, p.y, PAINT_RADIUS, (x, y) => setTempPixel(x, y, v));
        }
      }

      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        let t = temp[i];
        if (t >= 0) {
          buf[i] = t;
        }
      }
    }
  }

  strip_errors() {
    let buf = this.buffer;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] < 0) buf[i] = 0;
    }
  }
  add_error(pt, r = ERROR_RADIUS) {
    assert(pt instanceof Point);
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let ir = Math.ceil(r);
    for (let dy = -ir; dy <= ir; dy++) {
      let y = Math.floor(pt.y) + dy;
      if (y < 0 || y >= height) {
        continue;
      }
      for (let dx = -ir; dx <= ir; dx++) {
        let x = Math.floor(pt.x) + dx;
        if (x < 0 || x >= width) {
          continue;
        }
        if (dx*dx + dy*dy <= r*r && buf[width*y+x] <= 0) {
          buf[width*y+x] = -1;
        }
      }
    }
  }

  thin() {
    /* Remove all pixels that have neighbor not of the same color */
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let tbuf = this.temp;
    tbuf.fill(0);

    this.strip_errors();

    // put -1 into tbuf to mark the pixel should be cleared
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let erase = false;
        let c = buf[y*width+x];
        if (y === 0 || y === height - 1) {
          erase = true;
        } else if (x === 0 || x === width - 1) {
          erase = true;
        } else if (c > 0) {
          find:
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (buf[(y+dy)*width+(x+dx)] !== c) {
                erase = true;
                break find; 
              }
            }
          }
        }

        if (erase) {
          tbuf[y*width+x] = -1;
        }
      }
    }

    // clear pixels marked by tbuf
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (tbuf[y*width+x] === -1) {
          buf[y*width+x] = 0;
        }
      }
    }
  }

  thicken() {
    /* Add boundary pixels to colored regions */
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let tbuf = this.temp;
    tbuf.fill(0);

    this.strip_errors();

    // put colors into tbuf to mark the pixel should be colored
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (buf[y*width+x] > 0) {
          continue;
        }
        let c = 0;
        find:
        for (let y2 = y-1; y2 <= y+1; y2++) {
          if (y2 < 0 || y2 >= height) continue;
          for (let x2 = x-1; x2 <= x+1; x2++) {
            if (x2 < 0 || x2 >= width) continue;
            c = buf[y2*width+x2];
            if (c > 0)
              break find;
          }
        }

        tbuf[y*width+x] = c;
      }
    }

    // set pixels marked by tbuf
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let c = tbuf[y*width+x];
        if (c > 0) {
          buf[y*width+x] = c;
        }
      }
    }
  }

  clean_up() {
    let width = 0|this.width;
    let height = 0|this.height;
    let buf = this.buffer;
    let tbuf = this.temp;

    this.strip_errors();

    // clear boundary
    for (let x = 0; x < width; x++) {
      buf[width*0+x] = 0;
      buf[width*(height-1)+x] = 0;
    }
    for (let y = 0; y < height; y++) {
      buf[width*y+0] = 0;
      buf[width*y+width-1] = 0;
    }

    // morphological thinning of buf

    let nbuf = new Int8Array(3*3);
    function mthin(min_pcount, max_pcount) {
      let changed = false;
      for (let y = 1; y <= height - 2; y++) {
        for (let x = 1; x <= width - 2; x++) {
          let c = buf[width*y+x];
          if (c <= 0) {
            continue;
          }
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (buf[width*(y+dy)+(x+dx)] === c) {
                nbuf[3*(dy+1)+(dx+1)] = 1;
              } else {
                nbuf[3*(dy+1)+(dx+1)] = 0;
              }
            }
          }
          // fill in corners based on direct neighbors
          if (nbuf[3*0+1]) { // top
            if (nbuf[3*1+0]) { // left
              nbuf[3*0+0] = 1;
            }
            if (nbuf[3*1+2]) { // right
              nbuf[3*0+2] = 1;
            }
          }
          if (nbuf[3*2+1]) { // bottom
            if (nbuf[3*1+0]) { // left
              nbuf[3*2+0] = 1;
            }
            if (nbuf[3*1+2]) { // right
              nbuf[3*2+2] = 1;
            }
          }
          
          let state = nbuf[3*1+2];
          let pcount = 0; // pixel count
          let ccount = 0; // component changes
          function step(dx, dy) {
            let c2 = nbuf[3*(1+dy)+(1+dx)];
            if (c2 !== state) {
              ccount++;
              state = c2;
            }
            if (c2 > 0) {
              pcount++;
            }
          }
          // step counterclockwise around point
          step(1,1);
          step(0,1);
          step(-1,1);
          step(-1,0);
          step(-1,-1);
          step(0,-1);
          step(1,-1);
          step(1,0);
          if (pcount === 0) {
            // this is isolated vertex
            buf[width*y+x] = 0;
            // no need to set changed to true since there are no consequences to removing this
          } else if (ccount === 2) {
            // this is not a cut vertex
            if (min_pcount <= pcount && pcount <= max_pcount) {
              // this is not an end vertex
              buf[width*y+x] = 0;
              changed = true;
            }
          }
        }
      }
      return changed;
    }

    let changed = true;
    while (changed) {
      changed = mthin(3, 4);
      if (!changed) {
        changed = mthin(2, 6);
      }
      //changed = false;
    }

    // remove tips
    tbuf.fill(0);
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[width*y+x];
        if (c > 0) {
          let icount = -1;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (buf[width*(y+dy)+(x+dx)] === c) {
                icount++;
              }
            }
          }
          if (icount === 1) {
            tbuf[width*y+x] = 1;
          }
        }
      }
    }
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (tbuf[width*y+x] > 0) {
          buf[width*y+x] = 0;
        }
      }
    }
  }

  convert() {
    /* Returns a View of either a cleaned up version (with errors) or an interpreted knot diagram. */

    let knot = this.copy();
    knot.clean_up();

    let width = 0|knot.width,
        height = 0|knot.height,
        buf = knot.buffer;

    function n_neighbors(x, y) {
      /* number of neighbors of same color */
      let c = buf[y*width+x];
      let count = -1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (buf[(y+dy)*width+(x+dx)] === c) {
            count++;
          }
        }
      }
      return count;
    }

    /// Spur deletion
    
    function maybe_delete_spur(x, y, gas) {
      if (gas <= 0) {
        // this wasn't actually a spur
        return false;
      }
      let count = n_neighbors(x, y);
      if (count === 0) {
        return false;
      } else if (count === 1) {
        let c = buf[y*width+x];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!(dx === 0 && dy === 0) && buf[(y+dy)*width+(x+dx)] === c) {
              buf[y*width+x] = 0;
              let ok = maybe_delete_spur(x+dx, y+dy, gas-1);
              if (ok) {
                return true;
              } else {
                // revert!
                buf[y*width+x] = c;
                return false;
              }
            }
          }
        }
        throw new Error("Cannot get here.");
      } else {
        return true;
      }
    }

    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (buf[y*width+x] > 0 && n_neighbors(x, y) === 1) {
          // this is an endpoint
          maybe_delete_spur(x, y, SPUR_LENGTH);
        }
      }
    }

    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (buf[y*width+x] > 0 && n_neighbors(x, y) === 0) {
          // this is an isolated point
          buf[y*width+x] = 0;
        }
      }
    }

    /// Locate any junctions (errors)

    let found_error = false;
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        if (buf[y*width+x] > 0 && n_neighbors(x, y) > 2) {
          knot.add_error(new Point(x, y));
          found_error = true;
        }
      }
    }
    if (found_error) {
      knot.the_error = "The marked junctions cannot be interpreted. Usually this is because one of the understrands has fused to the overstrand, which can be fixed with a little erasing.";
      return knot;
    }

    /// Match up endpoints

    // Since we removed isolated points, we know there is an even number of endpoints per color

    // for counting number of times a line crosses:
    let tknot = knot.copy();
    tknot.thicken();

    let endpoints = new Map(); // Map(color => [Point])
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[y*width+x];
        if (c > 0 && n_neighbors(x, y) === 1) {
          let ep_list = endpoints.get(c);
          if (!ep_list) {
            ep_list = [];
            endpoints.set(c, ep_list);
          }
          ep_list.push(new Point(x, y));
        }
      }
    }
    function match_up(points, color, max_gap) {
      /* Looks for a perfect matching that optimizes a heuristic (sum
      of distances divided by (number of segments crossed - 1)).*/
      let graph = [];
      for (let i = 0; i < points.length; i++) {
        let p1 = points[i];
        for (let j = i + 1; j < points.length; j++) {
          let p2 = points[j];
          let d = Point.dist(p1, p2);
          if (d <= max_gap) { // TODO optimize this with a better datastructure
            let pcount = 0;
            let state = -2;
            for (let lp of line_points(p1, p2)) {
              let c = tknot.buffer[width*lp.y+lp.x];
              if (c !== state) {
                if (c > 0) {
                  pcount++;
                }
                state = c;
              }
            }
            if (pcount > 1) {
              // Then this is a non-backtracking line segment
              var score = d / (pcount - 1);
              graph.push([i, j, score, false]); // p1, p2, score, is_used
            }
          }
        }
      }
      graph.sort((e1, e2) => e1[2] - e2[2]);

      let best_score = Infinity;
      let best_match = null;

      let cur_match = [];
      let used_points = Array(points.length).fill(false);
      function find(cur_score, num_used_points, edge_i) {
        if (best_match !== null) {
          // TODO This might cause problems, but I hope the heuristic
          // of having the edges in ascending order of score will get
          // good enough results.  Otherwise large diagrams can take a
          // while...
          return;
        }
        if (cur_score >= best_score
            || 2*(graph.length - edge_i) < points.length - num_used_points) {
          return;
        }
        if (num_used_points === points.length) {
          best_score = cur_score;
          best_match = cur_match.slice();
          return;
        }
        for (; edge_i < graph.length; edge_i++) {
          let edge = graph[edge_i];
          let p1 = edge[0],
              p2 = edge[1];
          if (!used_points[p1] && !used_points[p2]) {
            used_points[p1] = true;
            used_points[p2] = true;
            cur_match.push(edge_i);
            find(cur_score + edge[2], num_used_points + 2, edge_i + 1);
            cur_match.pop();
            used_points[p1] = false;
            used_points[p2] = false;
          }
        }
      }

      find(0, 0, 0);
      if (best_match === null) {
        return null;
      }
      let edges = [];
      best_match.forEach(edge_j => {
        let edge = graph[edge_j];
        edges.push([points[edge[0]], points[edge[1]]]);
      });
      return edges;
    }

    // Collect the matching now.
    let matches = []; // [p1, p2, color]
    let errors = [];
    endpoints.forEach((points, color) => {
      let match = null;
      match = match_up(points, color, MAX_GAP_LENGTH);
      if (match === null) {
        found_error = true;
        points.forEach(pt => knot.add_error(pt));
        errors.push("Couldn't find a way to match up endpoints in the component of color "
                    + color + ".  This can be because some pair of endpoints are too far apart from each other.  Since it is hard to diagnose the problem algorithmically, all endpoints of the component have been marked.");
        return;
      }
      match.forEach(edge => {
        // check that the matching's edges do not intersect so far
        matches.forEach(prev_match => {
          let int = segments_intersect(prev_match[0], prev_match[1], edge[0], edge[1]);
          if (int) {
            found_error = true;
            knot.add_error(int);
            errors.push("There was a pair of matched-up endpoints whose matchings intersect.  The intersection point has been marked.");
          }
        });
        // then add this edge
        matches.push([edge[0], edge[1], color]);
      });
    });

    function do_error_stuff() {
      console.log("error");
/*      matches.forEach(match => {
        knot.draw_line(null, match[0], match[1], match[2], -1);
      });
      errors.push("(All found matchings are drawn in on of the thinned version of the picture, to give some idea of what the program is seeing.  This can usually be edited and converted without undoing.)");*/
      knot.the_error = errors;
      return knot;
    }

    if (found_error) {
      return do_error_stuff();
    }

    /// Take matches and construct 4-regular planar graph

    // walk_path destructively modifies buf
    buf = new Int8Array(buf);

    let verts = []; // [Point]
    let edges = []; // [v1, v2, color, overness]
    function vert_id(pt) {
      for (let i = 0; i < verts.length; i++) {
        if (Point.equal(verts[i], pt)) {
          return i;
        }
      }
      throw new Error("point not found");
    }

    function walk_path(c, x, y) {
      /* Walks the path from the given point.  Assumes path has at least two pixels. */
      // assumes color c at point (x,y)

      let pt1 = verts.length;
      verts.push(new Point(x, y));
      let last = null;
      if (n_neighbors(x, y) === 2) {
        last = pt1;
      }
      next_point:
      while (buf[y*width+x] === c) {
        buf[y*width + x] = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (c === buf[(y+dy)*width + (x+dx)]) {
              x = x + dx; y = y + dy;
              while (c === buf[(y+dy)*width + (x+dx)]) {
                buf[y*width + x] = 0;
                x = x + dx; y = y + dy;
              }
              let pt2 = verts.length;
              verts.push(new Point(x, y));
              edges.push([pt1, pt2, c, true]);
              pt1 = pt2;
              continue next_point;
            }
          }
        }
        if (last !== null) {
          edges.push([pt1, last, c, true]);
        }
      }
    }
    // Walk from endpoints:
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[y*width+x];
        if (c > 0 && n_neighbors(x, y) === 1) {
          walk_path(c, x, y);
        }
      }
    }
    // Unknots:
    for (let y = 1; y <= height - 2; y++) {
      for (let x = 1; x <= width - 2; x++) {
        let c = buf[y*width+x];
        if (c > 0) {
          walk_path(c, x, y);
        }
      }
    }

    // edges.forEach((edge, edge_id) => {
    //   console.log("edge " + edge + "  v0="+verts[edge[0]]+"  v1="+verts[edge[1]]);
    // });
    // console.log("---");

    matches.forEach(match => {
      let seg = [vert_id(match[0]), vert_id(match[1])];
      // Maybe seg runs through current vertices.  Split it if this is the case
      verts.forEach((v, vi) => {
        for (let i = 0; i + 1 < seg.length; i++) {
          if (seg[i] === vi || seg[i+1] === vi) {
            return;
          }
          if (segment_contains(verts[seg[i]], verts[seg[i+1]], v)) {
            //console.log("Hit vertex " + vi);
            seg.splice(i+1, 0, vi);
            return;
          }
        }
      });
      // Maybe (likely) seg intersects current edges.  Split both if this is the case
      var new_edges = [];
      edges.forEach((edge, edge_i) => {
        for (let i = 0; i + 1 < seg.length; i++) {
          let int_pt = segments_intersect(verts[edge[0]], verts[edge[1]],
                                          verts[seg[i]], verts[seg[i+1]]);          
          if (int_pt !== null) {
            //console.log("Segment " + seg +  " hit edge " + edge);
            // we know int_pt is a new point if it's not an endpoint
            let _int_pt_i = null;
            function int_pt_i() {
              if (_int_pt_i === null) {
                _int_pt_i = verts.length;
                verts.push(int_pt);
              }
              return _int_pt_i;
            }
            if (!Point.similar(int_pt, verts[edge[0]]) && !Point.similar(int_pt, verts[edge[1]])) {
              new_edges.push([int_pt_i(), edge[1], edge[2], true]);
              edge[1] = int_pt_i();
              //console.log("Splitting edge");
            }
            if (!Point.similar(int_pt, verts[seg[i]]) && !Point.similar(int_pt, verts[seg[i+1]])) {
              seg.splice(i+1, 0, int_pt_i());
              //console.log("Splitting segment");
            }
            // Since seg is a straight line segment, no other part of it can intersect the current edge
            return;
          }
        }
      });
      new_edges.forEach(e => edges.push(e));
      for (let i = 0; i + 1 < seg.length; i++) {
        edges.push([seg[i], seg[i+1], match[2], false]);
      }
    });

    // now the verts and edges are constructed

    /// Construct combinatorial map

    // use edges as darts, but negative id means edge in the opposite direction
    let adj_lists = [];
    for (let i = 0; i < verts.length; i++) {
      adj_lists[i] = [];
    }
    edges.forEach((edge, edge_id) => {
      //console.log("edge " + edge + "  v0="+verts[edge[0]]+"  v1="+verts[edge[1]]);
      adj_lists[edge[0]].push(edge_id+1);
      adj_lists[edge[1]].push(-edge_id-1);
    });

    let diagram = new KnotGraph(verts, edges, adj_lists);

    // sort adj_lists
    adj_lists.forEach((list, i) => {
      if (list.length === 2) {
        let e0 = diagram.dart_edge(list[0]), e1 = diagram.dart_edge(list[1]);
        assert(e0[2] === e1[2]); // same color
        return;
      }
      assert(list.length === 4);
      let vert = verts[i];
      let lverts = list.map(dart => diagram.dart_end(dart));
      // The angles are negative since the coordinate system has inverted y due to the canvas.
      let angles = lverts.map(vi => -pseudo_angle(vert, verts[vi]));
      function mswap(i, j) {
        /* maybe swap the angle and list arrays, depending on the value of the angle */
        if (angles[i] > angles[j]) {
          let t_angle = angles[i];
          angles[i] = angles[j];
          angles[j] = t_angle;
          let t_list = list[i];
          list[i] = list[j];
          list[j] = t_list;
        }
      }
      // sorting network
      mswap(1,3); mswap(0,2);
      mswap(0,1); mswap(2,3);
      mswap(1,2);
      for (let i = 0; i < 3; i++) {
        if (Math.abs((angles[i] - angles[i+1] + Math.PI) % (2 * Math.PI) - Math.PI) < 1e-6) {
          // This is an unexpected coincident pair of edges
          found_error = true;
          knot.add_error(vert);
          errors.push("The edges around the marked vertex were unexpectly coincident.  (This error has never been observed before!)");
          return;
        }
      }
      // Put undercrossing dart as first in adjacency list
      if (diagram.dart_edge(list[0])[3]) {
        list.push(list.shift());
      }
      // Consistency check
      let e0 = diagram.dart_edge(list[0]),
          e1 = diagram.dart_edge(list[1]),
          e2 = diagram.dart_edge(list[2]),
          e3 = diagram.dart_edge(list[3]);
      // is it a transverse crossing?
      if (!(!e0[3] && e1[3] && !e2[3] && e3[3]) // opposite sides are both over or under
          || !(e0[2] === e2[2] && e1[2] === e3[2])) { // opposite sides have same color
        found_error = true;
        knot.add_error(vert);
        errors.push("The marked crossing is not transverse.");
        return;
      }
    });

    if (found_error) {
      return do_error_stuff();
    }

    // now adj_lists contains correct rotation system for each vertex

    // let the diagram choose orientations
    diagram.ensure_orientation();

    return new KnotDiagramView(this.width, this.height, diagram);
  }
}
