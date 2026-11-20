// Checks that the shader text and the renderer agree: every uniform the renderer sends
// is declared in the shader, and the shader is WebGL2 (GLSL ES 3.00).

import { describe, expect, it } from "vitest";
import { HALO_FRAGMENT_SHADER, HALO_UNIFORM_NAMES, HALO_VERTEX_SHADER } from "./haloShader";

describe("halo shader source", () => {
  it("both shaders are GLSL ES 3.00 (WebGL2)", () => {
    expect(HALO_VERTEX_SHADER.startsWith("#version 300 es")).toBe(true);
    expect(HALO_FRAGMENT_SHADER.startsWith("#version 300 es")).toBe(true);
  });

  it("declares every uniform the renderer sends, and no others", () => {
    const declared = [...HALO_FRAGMENT_SHADER.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map(
      (match) => match[1],
    );
    expect([...declared].sort()).toEqual([...HALO_UNIFORM_NAMES].sort());
  });
});
