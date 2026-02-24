export type SpriteClip<TFrame> = {
  frames: TFrame[];
  frameDuration: number;
  loop?: boolean;
};

export class SpriteAnimator<TFrame> {
  private readonly clips = new Map<string, SpriteClip<TFrame>>();
  private activeClipName: string | null = null;
  private frameIndex = 0;
  private frameTime = 0;
  private currentFrame: TFrame;

  constructor(initialFrame: TFrame) {
    this.currentFrame = initialFrame;
  }

  public defineClip(name: string, clip: SpriteClip<TFrame>): this {
    if (clip.frames.length === 0) {
      throw new Error("Sprite clip must include at least one frame");
    }
    if (!(clip.frameDuration > 0)) {
      throw new Error("Sprite clip frameDuration must be > 0");
    }
    this.clips.set(name, { ...clip, frames: [...clip.frames] });
    return this;
  }

  public play(name: string): this {
    if (this.activeClipName === name) return this;
    const clip = this.clips.get(name);
    if (!clip) {
      throw new Error(`Unknown sprite clip: ${name}`);
    }
    this.activeClipName = name;
    this.frameIndex = 0;
    this.frameTime = 0;
    this.currentFrame = clip.frames[0]!;
    return this;
  }

  public update(dt: number): void {
    const clip = this.activeClipName ? this.clips.get(this.activeClipName) : null;
    if (!clip || clip.frames.length <= 1) return;

    this.frameTime += dt;
    while (this.frameTime >= clip.frameDuration) {
      this.frameTime -= clip.frameDuration;
      if (this.frameIndex + 1 < clip.frames.length) {
        this.frameIndex += 1;
      } else if (clip.loop ?? true) {
        this.frameIndex = 0;
      } else {
        this.frameIndex = clip.frames.length - 1;
      }
      this.currentFrame = clip.frames[this.frameIndex]!;
    }
  }

  public getFrame(): TFrame {
    return this.currentFrame;
  }
}
