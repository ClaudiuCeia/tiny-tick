import { CollisionEntity } from "../collision/CollisionEntity.ts";
import { CurveCollisionShape } from "../collision/shapes/CurveCollisionShape.ts";
import { type System, SystemPhase, SystemTickMode } from "../world/System.ts";
import { TransformComponent } from "../transform/TransformComponent.ts";
import { SpatialHashBroadphase } from "../collision/SpatialHashBroadphase.ts";
import { Vector2D } from "../math/Vector2D.ts";
import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import { PhysicsBodyComponent } from "./PhysicsBodyComponent.ts";
import { PhysicsBodyType } from "./PhysicsBodyType.ts";
import type { PhysicsStepStats, PhysicsSystemOptions } from "./types.ts";

type BodyEntry = {
  body: PhysicsBodyComponent;
  transform: TransformComponent;
  collider: CollisionEntity;
};

type Contact = {
  key: string;
  a: BodyEntry;
  b: BodyEntry;
  normal: Vector2D;
  penetration: number;
};

const EPS = 1e-8;

export class PhysicsSystem implements System {
  public readonly phase = SystemPhase.Collision;
  public readonly tickMode = SystemTickMode.Fixed;

  private readonly gravity: Vector2D;
  private readonly velocityIterations: number;
  private readonly positionIterations: number;
  private readonly maxPenetrationCorrection: number;
  private readonly penetrationSlop: number;
  private readonly sleepLinearThreshold: number;
  private readonly sleepTimeThreshold: number;
  private readonly broadphase: SpatialHashBroadphase;

  private readonly warnedMissingTransform = new Set<string>();
  private readonly warnedMissingCollider = new Set<string>();
  private readonly warnedCurveDynamic = new Set<string>();

  private stepStats: PhysicsStepStats = {
    colliders: 0,
    broadphasePairs: 0,
    contacts: 0,
    sleepingBodies: 0,
  };

  constructor(options: PhysicsSystemOptions = {}) {
    this.gravity = options.gravity?.clone() ?? new Vector2D(0, 980);
    this.velocityIterations = Math.max(1, Math.floor(options.velocityIterations ?? 4));
    this.positionIterations = Math.max(1, Math.floor(options.positionIterations ?? 2));
    this.maxPenetrationCorrection = Math.max(0, options.maxPenetrationCorrection ?? 8);
    this.penetrationSlop = Math.max(0, options.penetrationSlop ?? 0.01);
    this.sleepLinearThreshold = Math.max(0, options.sleepLinearThreshold ?? 8);
    this.sleepTimeThreshold = Math.max(0, options.sleepTimeThreshold ?? 0.35);
    this.broadphase = new SpatialHashBroadphase(options.broadphaseCellSize ?? 64);
  }

  public update(deltaTime: number): void {
    const entries = this.collectBodies();

    this.integrate(deltaTime, entries);

    const pairs = this.broadphase.queryPairs(entries.map((entry) => entry.collider));
    const colliderToBody = new Map(entries.map((entry) => [entry.collider.id, entry]));

    const contacts: Contact[] = [];
    const touchedDynamicBodies = new Set<PhysicsBodyComponent>();
    for (const [colA, colB] of pairs) {
      const a = colliderToBody.get(colA.id);
      const b = colliderToBody.get(colB.id);
      if (!a || !b) continue;

      if (!a.collider.isColliding(b.collider)) continue;
      const mtv = a.collider.getCollisionNormal(b.collider);
      if (!mtv) continue;

      const penetration = mtv.magnitude;
      if (penetration <= EPS) continue;

      const normal = mtv.normalize();
      const key =
        a.collider.id < b.collider.id
          ? `${a.collider.id}:${b.collider.id}`
          : `${b.collider.id}:${a.collider.id}`;
      contacts.push({ key, a, b, normal, penetration });
      if (a.body.type === PhysicsBodyType.Dynamic) touchedDynamicBodies.add(a.body);
      if (b.body.type === PhysicsBodyType.Dynamic) touchedDynamicBodies.add(b.body);

      if (this.canMove(a.body) && !a.body.isSleeping) {
        b.body.wake();
      }
      if (this.canMove(b.body) && !b.body.isSleeping) {
        a.body.wake();
      }
    }

    contacts.sort((a, b) => a.key.localeCompare(b.key));

    for (let i = 0; i < this.velocityIterations; i++) {
      for (const contact of contacts) {
        this.solveVelocity(contact);
      }
    }

    for (let i = 0; i < this.positionIterations; i++) {
      for (const contact of contacts) {
        this.solvePosition(contact);
      }
    }

    this.updateSleeping(deltaTime, entries, touchedDynamicBodies);

    this.stepStats = {
      colliders: entries.length,
      broadphasePairs: pairs.length,
      contacts: contacts.length,
      sleepingBodies: entries.reduce((count, entry) => count + (entry.body.isSleeping ? 1 : 0), 0),
    };
  }

  public getLastStepStats(): PhysicsStepStats {
    return this.stepStats;
  }

  private collectBodies(): BodyEntry[] {
    const entries: BodyEntry[] = [];

    for (const entity of this.getAllEntities()) {
      if (!entity.hasComponent(PhysicsBodyComponent)) continue;

      if (!entity.hasComponent(TransformComponent)) {
        if (!this.warnedMissingTransform.has(entity.id)) {
          this.warnedMissingTransform.add(entity.id);
          console.warn(`PhysicsSystem: ${entity.constructor.name} is missing TransformComponent`);
        }
        continue;
      }

      const collider =
        entity.getChild(CollisionEntity) ?? (entity instanceof CollisionEntity ? entity : null);
      if (!collider) {
        if (!this.warnedMissingCollider.has(entity.id)) {
          this.warnedMissingCollider.add(entity.id);
          console.warn(
            `PhysicsSystem: ${entity.constructor.name} is missing CollisionEntity child`,
          );
        }
        continue;
      }

      const body = entity.getComponent(PhysicsBodyComponent);
      if (collider.shape instanceof CurveCollisionShape && body.type !== PhysicsBodyType.Static) {
        if (!this.warnedCurveDynamic.has(entity.id)) {
          this.warnedCurveDynamic.add(entity.id);
          console.warn(
            `PhysicsSystem: Curve colliders must be static. ${entity.constructor.name} will be treated as static.`,
          );
        }
      }

      entries.push({
        body,
        transform: entity.getComponent(TransformComponent),
        collider,
      });
    }

    return entries;
  }

  private getAllEntities() {
    return EcsRuntime.getCurrent().registry.getAllEntities();
  }

  private integrate(dt: number, entries: BodyEntry[]): void {
    for (const entry of entries) {
      const body = entry.body;
      const transform = entry.transform.transform;

      if (body.type === PhysicsBodyType.Static || this.isCurveForcedStatic(entry)) {
        continue;
      }

      if (body.type === PhysicsBodyType.Kinematic) {
        const v = body.getVelocity();
        transform.position.x += v.x * dt;
        transform.position.y += v.y * dt;
        continue;
      }

      if (body.isSleeping) continue;

      const forceAcc = body.consumeForces().multiply(body.invMass);
      const gravityAcc = this.gravity.multiply(body.gravityScale);
      const accel = gravityAcc.add(forceAcc);

      let velocity = body.getVelocity().add(accel.multiply(dt));
      const damping = Math.max(0, 1 - body.linearDamping * dt);
      velocity = velocity.multiply(damping);

      body.setVelocity(velocity);

      transform.position.x += velocity.x * dt;
      transform.position.y += velocity.y * dt;
    }
  }

  private solveVelocity(contact: Contact): void {
    const bodyA = contact.a.body;
    const bodyB = contact.b.body;

    if (!this.canResolvePair(bodyA, bodyB, contact.a, contact.b)) return;

    const vA = bodyA.getVelocity();
    const vB = bodyB.getVelocity();
    const rv = vB.subtract(vA);

    const velAlongNormal = rv.dot(contact.normal);
    if (velAlongNormal > 0) return;

    const invMassA = this.effectiveInvMass(contact.a);
    const invMassB = this.effectiveInvMass(contact.b);
    const invMassSum = invMassA + invMassB;
    if (invMassSum <= EPS) return;

    const restitution = Math.max(bodyA.restitution, bodyB.restitution);
    const impulseScalar = (-(1 + restitution) * velAlongNormal) / invMassSum;
    const impulse = contact.normal.multiply(impulseScalar);

    if (invMassA > 0) bodyA.applyImpulse(impulse.negate());
    if (invMassB > 0) bodyB.applyImpulse(impulse);

    const nextVA = bodyA.getVelocity();
    const nextVB = bodyB.getVelocity();
    const nextRv = nextVB.subtract(nextVA);

    const tangentBase = nextRv.subtract(contact.normal.multiply(nextRv.dot(contact.normal)));
    if (tangentBase.magnitude <= EPS) return;

    const tangent = tangentBase.normalize();
    const jt = -nextRv.dot(tangent) / invMassSum;
    const friction = Math.sqrt(bodyA.friction * bodyB.friction);
    const maxFriction = impulseScalar * friction;
    const clampedJt = Math.max(-maxFriction, Math.min(jt, maxFriction));
    const frictionImpulse = tangent.multiply(clampedJt);

    if (invMassA > 0) bodyA.applyImpulse(frictionImpulse.negate());
    if (invMassB > 0) bodyB.applyImpulse(frictionImpulse);
  }

  private solvePosition(contact: Contact): void {
    const invMassA = this.effectiveInvMass(contact.a);
    const invMassB = this.effectiveInvMass(contact.b);
    const invMassSum = invMassA + invMassB;
    if (invMassSum <= EPS) return;

    const correctedPenetration = Math.max(contact.penetration - this.penetrationSlop, 0);
    if (correctedPenetration <= EPS) return;

    const correctionMagnitude = Math.min(
      (correctedPenetration / invMassSum) * 0.8,
      this.maxPenetrationCorrection,
    );
    const correction = contact.normal.multiply(correctionMagnitude);

    if (invMassA > 0) {
      contact.a.transform.transform.position.x -= correction.x * invMassA;
      contact.a.transform.transform.position.y -= correction.y * invMassA;
    }

    if (invMassB > 0) {
      contact.b.transform.transform.position.x += correction.x * invMassB;
      contact.b.transform.transform.position.y += correction.y * invMassB;
    }
  }

  private updateSleeping(
    dt: number,
    entries: BodyEntry[],
    touchedDynamicBodies: Set<PhysicsBodyComponent>,
  ): void {
    for (const entry of entries) {
      const body = entry.body;
      if (!body.canSleep || body.type !== PhysicsBodyType.Dynamic) continue;

      const speed = body.getVelocity().magnitude;
      const touched = touchedDynamicBodies.has(body);
      if (speed <= this.sleepLinearThreshold && !touched) {
        body.accumulateSleepTime(dt);
        if (body.sleepTime >= this.sleepTimeThreshold) {
          body.sleep();
        }
      } else {
        body.resetSleepTime();
      }
    }
  }

  private canMove(body: PhysicsBodyComponent): boolean {
    return body.type === PhysicsBodyType.Dynamic || body.type === PhysicsBodyType.Kinematic;
  }

  private canResolvePair(
    bodyA: PhysicsBodyComponent,
    bodyB: PhysicsBodyComponent,
    entryA: BodyEntry,
    entryB: BodyEntry,
  ): boolean {
    return (
      this.effectiveInvMass(entryA) > 0 ||
      this.effectiveInvMass(entryB) > 0 ||
      (bodyA.type === PhysicsBodyType.Dynamic && bodyB.type === PhysicsBodyType.Kinematic) ||
      (bodyB.type === PhysicsBodyType.Dynamic && bodyA.type === PhysicsBodyType.Kinematic)
    );
  }

  private effectiveInvMass(entry: BodyEntry): number {
    if (this.isCurveForcedStatic(entry)) return 0;
    if (entry.body.isSleeping) return 0;
    return entry.body.invMass;
  }

  private isCurveForcedStatic(entry: BodyEntry): boolean {
    return entry.collider.shape instanceof CurveCollisionShape;
  }
}
