export enum SystemPhase {
  Input = 0,
  Simulation = 100,
  Collision = 200,
  Render = 300,
}

export enum SystemTickMode {
  Frame = "frame",
  Fixed = "fixed",
}

export type IWorld = {
  readonly fixedDeltaTime: number;
};

export type SystemUpdateContext = {
  tickMode: SystemTickMode;
  /** 0 for fixed updates; [0, 1) interpolation remainder for frame updates. */
  alpha: number;
  /** Fixed step index for the current frame. 0 for frame updates. */
  fixedStepIndex: number;
};

export interface System {
  readonly phase?: SystemPhase;
  readonly tickMode?: SystemTickMode;

  awake?(world: IWorld): void;
  update?(deltaTime: number, world: IWorld, context: SystemUpdateContext): void;
  destroy?(world: IWorld): void;
}
