export const WIDTH = 800;
export const HEIGHT = 800;
export const PAINT_RADIUS = 1;
export const PAINT_GAP = 2;
export const ERASE_RADIUS = 5;
export const MIN_LINE_LENGTH = 2; // between mouse events
export const MAX_PPREV_DIST = 2*PAINT_RADIUS+1 + 2*PAINT_GAP; // for pencil-under
export const SPUR_LENGTH = 5; // the maximum-length spurs that will be auto-deleted in clean-up
export const ERROR_RADIUS = 6.5; // the radius of the red "error circles"
//export const MAX_GAP_LENGTH = 70; // for under-crossings and gaps in lines

export const DIAGRAM_LINE_WIDTH = 3; // the width of the lines when drawing a diagram
export const CROSSING_GAP = 8; // the gap for drawing crossings
export const CROSSING_CHANGE_RADIUS = 10; // the radius of the disk shown when hovering over a crossing
export const VIRTUAL_RADIUS = 8; // the radius for the circle at a virtual crossing

/* Colors for link components */
export const palette = [
  0x000000,
  0x0000ff,
  0xff0000,
  0x00cc00,
  0x888888,
  0x00aaee,
  0x00ff00,
  0xee00ee,
  0xee8800,
  0xffee00
];
