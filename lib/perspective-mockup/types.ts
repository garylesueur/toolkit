export type Point2D = {
  x: number;
  y: number;
};

/** Corner order: top-left, top-right, bottom-right, bottom-left */
export type Quad = [Point2D, Point2D, Point2D, Point2D];
