export class ObjectPool<T> {
  private free: T[] = [];
  private inUse: Set<T> = new Set();

  constructor(
    private factory: () => T,
    private reset?: (item: T) => void,
  ) {}

  public obtain(): T {
    const item = this.free.pop() ?? this.factory();
    this.inUse.add(item);
    return item;
  }

  public release(item: T): void {
    if (!this.inUse.delete(item)) return;
    this.reset?.(item);
    this.free.push(item);
  }

  public forEachInUse(fn: (item: T) => void): void {
    this.inUse.forEach(fn);
  }
}
