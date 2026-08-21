import { describe, expect, it } from "vitest";
import { calculateSquareCrop } from "./render-polaroid";

describe("calculateSquareCrop", () => {
  it("centers a portrait image at the base zoom", () => {
    expect(
      calculateSquareCrop(1600, 2400, { zoom: 1, panX: 0, panY: 0 }),
    ).toEqual({ sx: 0, sy: 400, size: 1600 });
  });

  it("moves a portrait crop to both vertical edges", () => {
    expect(
      calculateSquareCrop(1600, 2400, { zoom: 1, panX: 0, panY: -1 }),
    ).toEqual({ sx: 0, sy: 0, size: 1600 });
    expect(
      calculateSquareCrop(1600, 2400, { zoom: 1, panX: 0, panY: 1 }),
    ).toEqual({ sx: 0, sy: 800, size: 1600 });
  });

  it("supports zoomed crops on landscape images", () => {
    expect(
      calculateSquareCrop(2400, 1600, { zoom: 2, panX: 1, panY: 0 }),
    ).toEqual({ sx: 1600, sy: 400, size: 800 });
  });
});

