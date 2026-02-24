import { Vector2D } from "../math/Vector2D.ts";
import { describe, expect, test } from "bun:test";
import { TileScroller } from "./TileScroller.ts";

describe("TileScroller", () => {
  test("updates offset from speed and dt", () => {
    const scroller = new TileScroller(10, -5);
    scroller.update(0.5);

    const offset = scroller.getOffset();
    expect(offset.x).toBe(5);
    expect(offset.y).toBe(-2.5);
  });

  test("computes repeat-x tiles with wrapped offset", () => {
    const scroller = new TileScroller();
    scroller.setOffset(12, 0);

    const tiles = scroller.computeTiles({
      viewportWidth: 100,
      viewportHeight: 40,
      tileWidth: 32,
      tileHeight: 16,
      repeat: "x",
      originY: 20,
      overdrawTiles: 1,
    });

    expect(tiles[0]).toEqual({ x: -44, y: 20, width: 32, height: 16 });
    expect(tiles.some((t) => t.x === 84)).toBe(true);
  });

  test("reset clears offsets", () => {
    const scroller = new TileScroller(20, 10);
    scroller.update(1);
    scroller.reset();

    expect(scroller.getOffset()).toEqual(new Vector2D(0, 0));
  });
});
