import { EcsRuntime } from "../ecs/EcsRuntime.ts";
import {
  SystemPhase,
  SystemTickMode,
  type IWorld,
  type System,
  type SystemUpdateContext,
} from "./System.ts";

type WorldSystemEntry = {
  system: System;
  phase: SystemPhase;
  tickMode: SystemTickMode;
  insertionOrder: number;
};

export type WorldOptions = {
  runtime?: EcsRuntime;
  fixedDeltaTime?: number;
  maxSubSteps?: number;
  maxFrameDelta?: number;
};

export type WorldStepResult = {
  fixedSteps: number;
  alpha: number;
};

export class World implements IWorld {
  private readonly runtime: EcsRuntime;
  private readonly maxSubSteps: number;
  private readonly maxFrameDelta: number;
  private accumulator = 0;
  private systems: WorldSystemEntry[] = [];
  private nextInsertionOrder = 0;

  constructor(options: WorldOptions = {}) {
    this.runtime = options.runtime ?? EcsRuntime.getCurrent();
    this.fixedDeltaTime = options.fixedDeltaTime ?? 1 / 60;
    this.maxSubSteps = options.maxSubSteps ?? 8;
    this.maxFrameDelta = options.maxFrameDelta ?? 0.25;
  }

  public readonly fixedDeltaTime: number;

  public addSystem(system: System): this {
    const entry: WorldSystemEntry = {
      system,
      phase: system.phase ?? SystemPhase.Simulation,
      tickMode: system.tickMode ?? SystemTickMode.Fixed,
      insertionOrder: this.nextInsertionOrder++,
    };

    this.systems.push(entry);
    this.sortSystems();

    this.runWithRuntime(() => {
      system.awake?.(this);
    });

    return this;
  }

  public removeSystem(system: System): boolean {
    const index = this.systems.findIndex((entry) => entry.system === system);
    if (index === -1) return false;

    const [entry] = this.systems.splice(index, 1);
    this.runWithRuntime(() => {
      entry?.system.destroy?.(this);
    });
    return true;
  }

  public clearSystems(): void {
    const entries = [...this.systems];
    this.systems.length = 0;
    this.runWithRuntime(() => {
      for (const entry of entries) {
        entry.system.destroy?.(this);
      }
    });
  }

  public step(deltaTime: number): WorldStepResult {
    const clamped = Math.max(0, Math.min(deltaTime, this.maxFrameDelta));

    this.runFrameSystems(clamped, (entry) => entry.phase <= SystemPhase.Input, 0);

    this.accumulator += clamped;
    let fixedSteps = 0;
    while (this.accumulator >= this.fixedDeltaTime && fixedSteps < this.maxSubSteps) {
      this.runFixedSystems(this.fixedDeltaTime, fixedSteps);
      this.accumulator -= this.fixedDeltaTime;
      fixedSteps++;
    }

    const alpha = this.fixedDeltaTime === 0 ? 0 : this.accumulator / this.fixedDeltaTime;
    this.runFrameSystems(clamped, (entry) => entry.phase > SystemPhase.Input, alpha);

    return { fixedSteps, alpha };
  }

  public resetTime(): void {
    this.accumulator = 0;
  }

  private runFixedSystems(deltaTime: number, fixedStepIndex: number): void {
    this.runWithRuntime(() => {
      for (const entry of this.systems) {
        if (entry.tickMode !== SystemTickMode.Fixed) continue;
        const context: SystemUpdateContext = {
          tickMode: SystemTickMode.Fixed,
          alpha: 0,
          fixedStepIndex,
        };
        entry.system.update?.(deltaTime, this, context);
      }
    });
  }

  private runFrameSystems(
    deltaTime: number,
    predicate: (entry: WorldSystemEntry) => boolean,
    alpha: number,
  ): void {
    this.runWithRuntime(() => {
      for (const entry of this.systems) {
        if (entry.tickMode !== SystemTickMode.Frame) continue;
        if (!predicate(entry)) continue;
        const context: SystemUpdateContext = {
          tickMode: SystemTickMode.Frame,
          alpha,
          fixedStepIndex: 0,
        };
        entry.system.update?.(deltaTime, this, context);
      }
    });
  }

  private runWithRuntime<T>(fn: () => T): T {
    return EcsRuntime.runWith(this.runtime, fn);
  }

  private sortSystems(): void {
    this.systems.sort((a, b) => {
      if (a.phase !== b.phase) return a.phase - b.phase;
      return a.insertionOrder - b.insertionOrder;
    });
  }
}
