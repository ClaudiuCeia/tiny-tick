import { Vector2D } from "../math/Vector2D.ts";
import { PhysicsBodyType } from "./PhysicsBodyType.ts";

export type PhysicsBodyOptions = {
  type?: PhysicsBodyType;
  mass?: number;
  restitution?: number;
  friction?: number;
  gravityScale?: number;
  linearDamping?: number;
  canSleep?: boolean;
};

export type PhysicsSystemOptions = {
  gravity?: Vector2D;
  broadphaseCellSize?: number;
  velocityIterations?: number;
  positionIterations?: number;
  maxPenetrationCorrection?: number;
  penetrationSlop?: number;
  sleepLinearThreshold?: number;
  sleepTimeThreshold?: number;
};

export type PhysicsStepStats = {
  colliders: number;
  broadphasePairs: number;
  contacts: number;
  sleepingBodies: number;
};
