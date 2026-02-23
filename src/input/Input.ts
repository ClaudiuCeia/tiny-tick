import { Vector2D } from "../math/Vector2D.ts";

/**
 * Runtime-scoped input manager with per-frame state tracking.
 *
 * Call `init()` once at game boot, then `clearFrame()` at the end
 * of each frame to reset pressed/released state.
 *
 * - `isDown(key)` — key is currently held
 * - `isPressed(key)` — key became pressed this frame (single-frame)
 * - `isReleased(key)` — key was released this frame (single-frame)
 */
export class InputManager {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private released = new Set<string>();
  private mouseClick = false;
  private mousePos = new Vector2D(0, 0);
  private initialized = false;
  private target: EventTarget | null = null;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.down.has(e.key)) {
      this.pressed.add(e.key);
    }
    this.down.add(e.key);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.down.delete(e.key);
    this.released.add(e.key);
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    this.mousePos.x = e.clientX;
    this.mousePos.y = e.clientY;
  };

  private readonly onClick = (): void => {
    this.mouseClick = true;
  };

  public init(target: EventTarget = document.body): void {
    if (this.initialized) return;
    this.target = target;
    this.target.addEventListener("keydown", this.onKeyDown as EventListener);
    this.target.addEventListener("keyup", this.onKeyUp as EventListener);
    this.target.addEventListener("mousemove", this.onMouseMove as EventListener);
    this.target.addEventListener("click", this.onClick as EventListener);
    this.initialized = true;
  }

  public dispose(): void {
    if (!this.initialized || !this.target) return;
    this.target.removeEventListener("keydown", this.onKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.onKeyUp as EventListener);
    this.target.removeEventListener("mousemove", this.onMouseMove as EventListener);
    this.target.removeEventListener("click", this.onClick as EventListener);
    this.target = null;
    this.initialized = false;
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
    this.mouseClick = false;
    this.mousePos = new Vector2D(0, 0);
  }

  public isDown(key: string): boolean {
    return this.down.has(key);
  }

  public isPressed(key: string): boolean {
    return this.pressed.has(key);
  }

  public isReleased(key: string): boolean {
    return this.released.has(key);
  }

  /** True only on the frame the user clicked. */
  public isMouseClick(): boolean {
    return this.mouseClick;
  }

  public getMousePos(): Vector2D {
    return this.mousePos;
  }

  /** Call once at the end of each frame to reset pressed/released state. */
  public clearFrame(): void {
    this.pressed.clear();
    this.released.clear();
    this.mouseClick = false;
  }
}
