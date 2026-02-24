import { describe, expect, test } from "bun:test";
import { ParallaxLayer } from "./ParallaxLayer.ts";

const mockImage = (width: number, height: number): HTMLImageElement =>
  ({
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
  }) as HTMLImageElement;

describe("ParallaxLayer", () => {
  test("renders tiled images and applies seam overlap", () => {
    const draws: Array<{ x: number; y: number; width: number; height: number }> = [];
    const ctx = {
      globalAlpha: 1,
      save: () => {},
      restore: () => {},
      drawImage: (_img: HTMLImageElement, x: number, y: number, width: number, height: number) => {
        draws.push({ x, y, width, height });
      },
    } as unknown as CanvasRenderingContext2D;

    const layer = new ParallaxLayer({
      image: mockImage(64, 32),
      repeat: "x",
      speedX: 16,
      seamOverlapPx: 1,
    });

    layer.update(1);
    layer.render(ctx, { width: 128, height: 64 }, { originY: 10 });

    expect(draws.length).toBeGreaterThan(0);
    expect(draws[0]?.height).toBe(33);
    expect(draws.every((d) => d.y === 10)).toBe(true);
  });
});
