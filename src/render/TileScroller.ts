import { Vector2D } from "../math/Vector2D.ts";

export type TileRepeatMode = "x" | "y" | "both" | "none";

export type TileLayout = {
  viewportWidth: number;
  viewportHeight: number;
  tileWidth: number;
  tileHeight: number;
  originX?: number;
  originY?: number;
  repeat?: TileRepeatMode;
  overdrawTiles?: number;
};

export type TileRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const wrapOffset = (offset: number, size: number): number => {
  if (size <= 0) return 0;
  const wrapped = offset % size;
  return wrapped < 0 ? wrapped + size : wrapped;
};

export class TileScroller {
  private readonly offset = new Vector2D(0, 0);

  constructor(
    private speedX = 0,
    private speedY = 0,
  ) {}

  public setSpeed(x: number, y: number): this {
    this.speedX = x;
    this.speedY = y;
    return this;
  }

  public update(dt: number): void {
    this.offset.set(this.offset.x + this.speedX * dt, this.offset.y + this.speedY * dt);
  }

  public reset(): void {
    this.offset.set(0, 0);
  }

  public setOffset(x: number, y: number): void {
    this.offset.set(x, y);
  }

  public getOffset(): Vector2D {
    return this.offset.clone();
  }

  public computeTiles(layout: TileLayout): TileRect[] {
    const repeat = layout.repeat ?? "both";
    const overdraw = Math.max(0, Math.floor(layout.overdrawTiles ?? 1));
    const originX = layout.originX ?? 0;
    const originY = layout.originY ?? 0;
    const tw = layout.tileWidth;
    const th = layout.tileHeight;

    if (tw <= 0 || th <= 0 || layout.viewportWidth <= 0 || layout.viewportHeight <= 0) {
      return [];
    }

    const xList =
      repeat === "x" || repeat === "both"
        ? this.computeAxis(originX, this.offset.x, tw, layout.viewportWidth, overdraw)
        : [originX - wrapOffset(this.offset.x, tw)];

    const yList =
      repeat === "y" || repeat === "both"
        ? this.computeAxis(originY, this.offset.y, th, layout.viewportHeight, overdraw)
        : [originY - wrapOffset(this.offset.y, th)];

    const rects: TileRect[] = [];
    for (const y of yList) {
      for (const x of xList) {
        rects.push({ x, y, width: tw, height: th });
      }
    }

    return rects;
  }

  private computeAxis(
    origin: number,
    offset: number,
    tileSize: number,
    viewportSize: number,
    overdraw: number,
  ): number[] {
    const wrapped = wrapOffset(offset, tileSize);
    const start = origin - wrapped - tileSize * overdraw;
    const end = viewportSize + tileSize * overdraw;
    const values: number[] = [];
    for (let value = start; value <= end; value += tileSize) {
      values.push(value);
    }
    return values;
  }
}
