import type { StateStore } from "./StateStore.ts";

export class RefAtom<T extends object | null> {
  private value: T;
  private bound = false;
  private store: StateStore | null = null;
  private key: string | null = null;

  public constructor(
    public readonly name: string,
    defaultValue: T,
  ) {
    this.value = defaultValue;
  }

  public get(): T {
    if (this.store && this.key) {
      const value = this.store.getAtomValue<T>(this.key);
      if (value !== undefined) {
        return value;
      }
    }
    return this.value;
  }

  public set(value: T): void {
    if (this.store && this.key) {
      this.store.setAtomValue(this.key, value);
      return;
    }
    this.value = value;
  }

  public _bind(store: StateStore, key: string, persist = true): void {
    this.store = store;
    this.key = key;
    this.store.registerAtom(key, this.value, { persist });
    this.bound = true;
  }

  public _unbind(): void {
    this.store = null;
    this.key = null;
    this.bound = false;
  }

  public get _isBound(): boolean {
    return this.bound;
  }
}
