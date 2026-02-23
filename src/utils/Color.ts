export class Color {
  /** r, g, b values in the 0–255 range */
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}

  /** Returns an RGBA CSS string. `alpha` is 0–1. */
  toRgbaString(alpha: number): string {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${alpha.toFixed(2)})`;
  }

  /**
   * Returns a new Color with each component randomized within the given variation.
   * Variation is applied symmetrically: [base - variation/2, base + variation/2].
   */
  static random(base: number, variation: number): Color {
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const half = variation / 2;
    return new Color(
      clamp(base - half + Math.random() * variation),
      clamp(base - half + Math.random() * variation),
      clamp(base - half + Math.random() * variation),
    );
  }
}
