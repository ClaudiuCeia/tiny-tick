import { bootstrapDinoRunner } from "./game/Bootstrap.ts";

const mount = document.getElementById("app") ?? document.body;
const params = new URLSearchParams(window.location.search);
const pixelScaleParam = Number(params.get("pixelScale") ?? "1");

void bootstrapDinoRunner(mount, {
  pixelScale: Number.isFinite(pixelScaleParam) ? pixelScaleParam : 1,
}).catch((error) => {
  console.error("Failed to bootstrap dino-runner", error);
});
