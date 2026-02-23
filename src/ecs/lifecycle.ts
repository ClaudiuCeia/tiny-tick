export interface IAwakable {
  awake(): void;
  destroy?(): void;
}

export interface IWithUpdate {
  update(deltaTime: number): void;
}
