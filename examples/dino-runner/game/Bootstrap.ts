import {
  EcsRuntime,
  PhysicsSystem,
  SceneManager,
  SystemPhase,
  SystemTickMode,
  Vector2D,
  World,
  type ICanvas,
} from "./lib.ts";
import { RunnerScene } from "./scenes/RunnerScene.ts";

const createCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 500;
  canvas.style.width = "900px";
  canvas.style.height = "500px";
  canvas.style.border = "1px solid #2c2c2c";
  canvas.style.background = "#181818";
  return canvas;
};

export const bootstrapDinoRunner = (mount: HTMLElement = document.body): void => {
  const canvas = createCanvas();
  mount.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }

  const runtime = new EcsRuntime();
  runtime.input.init(window);

  const sceneManager = new SceneManager();
  const canvasView: ICanvas = {
    context: ctx,
    size: new Vector2D(canvas.width, canvas.height),
  };

  const scene = new RunnerScene(runtime, canvasView);
  sceneManager.changeScene(scene);
  const world = new World({ runtime, fixedDeltaTime: 1 / 120, maxSubSteps: 8 });

  world.addSystem({
    phase: SystemPhase.Input,
    tickMode: SystemTickMode.Frame,
    update() {
      // Input listeners feed the runtime state. This phase makes ordering explicit.
    },
  });

  world.addSystem({
    phase: SystemPhase.Simulation,
    tickMode: SystemTickMode.Fixed,
    update(dt) {
      sceneManager.update(dt);
    },
  });

  world.addSystem(
    new PhysicsSystem({
      gravity: new Vector2D(0, 1400),
      velocityIterations: 8,
      positionIterations: 2,
      broadphaseCellSize: 64,
      sleepLinearThreshold: 2,
      sleepTimeThreshold: 0.2,
    }),
  );

  world.addSystem({
    phase: SystemPhase.Render,
    tickMode: SystemTickMode.Frame,
    update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sceneManager.render(ctx);
      runtime.input.clearFrame();
    },
  });

  let lastTs = performance.now();

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - lastTs) / 1000);
    lastTs = now;

    world.step(dt);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
};
