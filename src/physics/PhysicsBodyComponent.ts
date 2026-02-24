import { Component } from "../ecs/Component.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { PhysicsBodyType } from "./PhysicsBodyType.ts";
import type { PhysicsBodyOptions } from "./types.ts";

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export class PhysicsBodyComponent extends Component {
  private _type: PhysicsBodyType;
  private _mass: number;
  private _restitution: number;
  private _friction: number;
  private _gravityScale: number;
  private _linearDamping: number;
  private _canSleep: boolean;
  private _isSleeping = false;

  private _velocity = Vector2D.zero;
  private _forces = Vector2D.zero;
  private _sleepTime = 0;

  constructor(options: PhysicsBodyOptions = {}) {
    super();
    this._type = options.type ?? PhysicsBodyType.Dynamic;
    this._mass = Math.max(0.0001, options.mass ?? 1);
    this._restitution = clamp01(options.restitution ?? 0);
    this._friction = clamp01(options.friction ?? 0.2);
    this._gravityScale = Math.max(0, options.gravityScale ?? 1);
    this._linearDamping = Math.max(0, options.linearDamping ?? 0);
    this._canSleep = options.canSleep ?? this._type === PhysicsBodyType.Dynamic;

    if (this._type !== PhysicsBodyType.Dynamic) {
      this._canSleep = false;
    }
  }

  public get type(): PhysicsBodyType {
    return this._type;
  }

  public setBodyType(type: PhysicsBodyType): this {
    this._type = type;
    if (type !== PhysicsBodyType.Dynamic) {
      this._canSleep = false;
      this._isSleeping = false;
      this._sleepTime = 0;
      this._forces = Vector2D.zero;
    }
    return this;
  }

  public get mass(): number {
    return this._mass;
  }

  public setMass(mass: number): this {
    this._mass = Math.max(0.0001, mass);
    return this;
  }

  public get invMass(): number {
    return this._type === PhysicsBodyType.Dynamic ? 1 / this._mass : 0;
  }

  public get restitution(): number {
    return this._restitution;
  }

  public setRestitution(value: number): this {
    this._restitution = clamp01(value);
    return this;
  }

  public get friction(): number {
    return this._friction;
  }

  public setFriction(value: number): this {
    this._friction = clamp01(value);
    return this;
  }

  public get gravityScale(): number {
    return this._gravityScale;
  }

  public setGravityScale(value: number): this {
    this._gravityScale = Math.max(0, value);
    return this;
  }

  public get linearDamping(): number {
    return this._linearDamping;
  }

  public setLinearDamping(value: number): this {
    this._linearDamping = Math.max(0, value);
    return this;
  }

  public get canSleep(): boolean {
    return this._canSleep;
  }

  public setCanSleep(canSleep: boolean): this {
    this._canSleep = this._type === PhysicsBodyType.Dynamic && canSleep;
    if (!this._canSleep) {
      this._isSleeping = false;
      this._sleepTime = 0;
    }
    return this;
  }

  public get isSleeping(): boolean {
    return this._isSleeping;
  }

  public getVelocity(): Vector2D {
    return this._velocity;
  }

  public setVelocity(v: Vector2D): this {
    this._velocity = v.clone();
    if (this._type === PhysicsBodyType.Dynamic && v.magnitude > 0) {
      this.wake();
    }
    return this;
  }

  public addForce(force: Vector2D): this {
    if (this._type !== PhysicsBodyType.Dynamic) return this;
    this._forces = this._forces.add(force);
    if (force.magnitude > 0) {
      this.wake();
    }
    return this;
  }

  public consumeForces(): Vector2D {
    const current = this._forces;
    this._forces = Vector2D.zero;
    return current;
  }

  public applyImpulse(impulse: Vector2D): this {
    if (this._type !== PhysicsBodyType.Dynamic) return this;
    this._velocity = this._velocity.add(impulse.multiply(this.invMass));
    if (impulse.magnitude > 0) {
      this.wake();
    }
    return this;
  }

  public wake(): this {
    this._isSleeping = false;
    this._sleepTime = 0;
    return this;
  }

  public sleep(): this {
    if (!this._canSleep || this._type !== PhysicsBodyType.Dynamic) return this;
    this._isSleeping = true;
    this._velocity = Vector2D.zero;
    this._forces = Vector2D.zero;
    return this;
  }

  public accumulateSleepTime(dt: number): void {
    this._sleepTime += dt;
  }

  public resetSleepTime(): void {
    this._sleepTime = 0;
  }

  public get sleepTime(): number {
    return this._sleepTime;
  }
}
