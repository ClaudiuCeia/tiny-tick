# @claudiu-ceia/tiny-tick

Tiny 2D game kitchen-sink for TypeScript + Bun.

## Overview

`tiny-tick` is a small ECS-style runtime toolkit extracted from previous JS game experiments. 

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
bun add @claudiu-ceia/tiny-tick
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
} from "@claudiu-ceia/tiny-tick";

class Box extends Entity {
  constructor() {
    super();
    this.addComponent(new TransformComponent({ position: new Vector2D(100, 80), rotation: 0, scale: 1 }));
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
