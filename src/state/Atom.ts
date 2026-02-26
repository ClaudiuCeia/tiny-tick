export class Atom<T> {
  private value: T;
  private bound = false;

  public constructor(
    public readonly name: string,
    defaultValue: T,
  ) {
    this.value = defaultValue;
  }

  public get(): T {
    return this.value;
  }

  public set(value: T): void {
    this.value = value;
  }

  public _bind(): void {
    this.bound = true;
  }

  public _unbind(): void {
    this.bound = false;
  }

  public get _isBound(): boolean {
    return this.bound;
  }
}
