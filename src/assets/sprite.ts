export type DrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const fitRectContain = (srcWidth: number, srcHeight: number, target: DrawRect): DrawRect => {
  if (srcWidth <= 0 || srcHeight <= 0 || target.width <= 0 || target.height <= 0) {
    return { ...target };
  }

  const srcAspect = srcWidth / srcHeight;
  const targetAspect = target.width / target.height;

  if (srcAspect > targetAspect) {
    const width = target.width;
    const height = width / srcAspect;
    return {
      x: target.x,
      y: target.y + (target.height - height) / 2,
      width,
      height,
    };
  }

  const height = target.height;
  const width = height * srcAspect;
  return {
    x: target.x + (target.width - width) / 2,
    y: target.y,
    width,
    height,
  };
};
