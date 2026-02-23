# dino-runner

Small endless runner inspired by the Chrome dinosaur game.

## What this proves

- Runtime-scoped input + world state
- Scene lifecycle and reset flow
- Basic platform-style movement (jump + gravity)
- Obstacle spawning and collision-driven game over
- HUD rendering and score updates

## Controls

- Jump: `Space`, `W`, or `ArrowUp`
- Restart after game over: `R`

## Run

```bash
bun run example:dino-runner
```

Then open `http://localhost:5174`.

## Test

```bash
bun test examples/dino-runner
```
