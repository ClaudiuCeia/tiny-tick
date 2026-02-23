// Map x (a value between 0 and 1) to 0->1->0
export const tent = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return x * 2;
  return (1 - x) * 2;
};

export const easeInOut = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return x * x * 2;
  return (1 - x) * (1 - x) * 2;
};

export const bounce = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return Math.sin(x * Math.PI);
  return Math.sin((1 - x) * Math.PI);
};

export const elastic = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return Math.sin(x * Math.PI * 2);
  return Math.sin((1 - x) * Math.PI * 2);
};

export const elasticInOut = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return Math.sin(x * Math.PI * 4);
  return Math.sin((1 - x) * Math.PI * 4);
};

export const easeIn = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return x * x;
  return (1 - x) * (1 - x);
};

export const easeOut = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return x * x;
  return (1 - x) * (1 - x);
};

export const exponential = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return Math.pow(x, 2);
  return Math.pow(1 - x, 2);
};

export const exponentialInOut = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return Math.pow(x, 3);
  return Math.pow(1 - x, 3);
};

export const bounceInOut = (x: number) => {
  if (x < 0 || x > 1) return 0;
  if (x < 0.5) return Math.sin(x * Math.PI * 2);
  return Math.sin((1 - x) * Math.PI * 2);
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
