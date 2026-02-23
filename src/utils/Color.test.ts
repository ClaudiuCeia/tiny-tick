import { describe, test, expect } from "bun:test";
import { Color } from "./Color.ts";

describe("Color", () => {
  test("toRgbaString formats with fixed precision alpha", () => {
    const c = new Color(10, 20, 30);
    expect(c.toRgbaString(0.125)).toBe("rgba(10, 20, 30, 0.13)");
  });

  test("random returns values in [0,255] and within variation range", () => {
    const c = Color.random(100, 20);

    expect(c.r).toBeGreaterThanOrEqual(90);
    expect(c.r).toBeLessThanOrEqual(110);
    expect(c.g).toBeGreaterThanOrEqual(90);
    expect(c.g).toBeLessThanOrEqual(110);
    expect(c.b).toBeGreaterThanOrEqual(90);
    expect(c.b).toBeLessThanOrEqual(110);
  });

  test("random clamps values to bounds", () => {
    const low = Color.random(0, 1000);
    const high = Color.random(255, 1000);

    for (const channel of [low.r, low.g, low.b, high.r, high.g, high.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});
