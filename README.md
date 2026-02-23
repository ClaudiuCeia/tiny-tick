# @claudiu-ceia/tiny-tick

Tiny game toolkit playground.

This came out of experiments around ideas from a couple of JS based game projects.

## Important

This is **not** a serious production library right now.

It is mostly a personal playground where I try ideas, break things, and learn.
If it helps someone else, great, but I do not recommend depending on it yet.
This is only published so I can use it in my own projects rather than copy-pasting code around.

## Install

```bash
bun add @claudiu-ceia/tiny-tick
```

## Usage

```ts
import { Entity, EcsRuntime } from "@claudiu-ceia/tiny-tick";

class Player extends Entity {}

const runtime = new EcsRuntime();
EcsRuntime.runWith(runtime, () => {
  const player = new Player();
  player.awake();
});
```

## Development

```bash
bun install
bun run check
```

Scripts:

- `bun run typecheck`
- `bun run lint`
- `bun run format`
- `bun run format:check`
- `bun run test`
- `bun run test:coverage`
- `bun run check`
- `bun run example:bouncy-arena`
- `bun run example:dino-runner`

## License

MIT
