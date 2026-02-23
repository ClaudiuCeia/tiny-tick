/** Deterministic, seedable Linear Congruential Generator. */
export class LCG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /** Returns a pseudo-random number in [0, 1). */
  public random(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return this.seed / 0x100000000;
  }
}
