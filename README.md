# @claudiu-ceia/tick

Tiny 2D game kitchen-sink for TypeScript + Bun.

## Overview

`tick` is a small ECS-style runtime toolkit extracted from previous JS game experiments.

It currently includes:

- ECS primitives (`Entity`, `Component`, `EntityRegistry`)
- Ordered/fixed-step world scheduler (`World` + systems)
- Input manager (keyboard + mouse state)
- Collision shapes/entities + broadphase (`SpatialHashBroadphase`)
- Lightweight physics (`PhysicsBodyComponent`, `PhysicsSystem`)
- Render/scene utilities and a few debug helpers

## Status

This is not a serious production engine right now (probably never).

It is mostly a personal playground for experimenting and learning. I publish it so I can reuse it across projects without copy-pasting.

## Install

```bash
bun add @claudiu-ceia/tick
```

## Quickstart

```ts
import {
  EcsRuntime,
  Entity,
  PhysicsBodyComponent,
  PhysicsSystem,
  RectangleCollisionShape,
  CollisionEntity,
  TransformComponent,
  Vector2D,
  World,
} from "@claudiu-ceia/tick";

class Box extends Entity {
  constructor() {
    super();
    this.addComponent(
      new TransformComponent({ position: new Vector2D(100, 80), rotation: 0, scale: 1 }),
    );
    this.addComponent(new PhysicsBodyComponent());
    this.addChild(new CollisionEntity(new RectangleCollisionShape(24, 24), "center"));
  }
}

const runtime = new EcsRuntime();
const world = new World({ runtime, fixedDeltaTime: 1 / 60 });
world.addSystem(new PhysicsSystem());

EcsRuntime.runWith(runtime, () => {
  const box = new Box();
  box.awake();
});
```

## Examples

Run locally:

- `bun run example:bouncy-arena`
- `bun run example:dino-runner`
- `bun run example:collision-lab`
- `bun run example:pixel-painter`

## Persistence (brief)

Persistence is runtime-scoped (`runtime.store`) and opt-in.

1. Add `static type` on persisted entities/components.
2. Declare state in components with `this.atom(...)` and `this.ref(...)`.
3. Register persisted entities with `runtime.registerPersistedEntity(...)`.
4. Save with `runtime.store.snapshot(...)` and restore with `runtime.loadSnapshot(snapshot)`.

## Assets (runtime-scoped)

Each `EcsRuntime` has an `assets` manager with scope-based lifecycle.

```ts
const scope = runtime.assets.createScope("main-scene");

await scope.loadImage("atlas", "/assets/runner.png");
await scope.loadAudio("jump", "/assets/jump.wav");
await scope.loadFont("pixel", "PixelFont", "url(/assets/pixel.woff2)");
await scope.loadSpriteSheetGrid("runner", "atlas", {
  frameWidth: 24,
  frameHeight: 24,
  count: 8,
  columns: 8,
});

const atlas = scope.getImage("atlas");
const runSheet = scope.getSpriteSheet("runner");

// On scene teardown:
scope.release();
```

## Development

```bash
bun install
bun run check
```

Useful scripts:

- `bun run typecheck`
- `bun run lint`
- `bun run format`
- `bun run format:check`
- `bun run test`
- `bun run test:coverage`
- `bun run check`

## License

MIT
