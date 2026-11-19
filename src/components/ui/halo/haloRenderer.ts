// Talks to WebGL2 for the halo: compiles the shader, sends the numbers (uniforms) and
// draws one frame. No React here; HaloField decides *when* to draw, this file only
// knows *how*. If anything fails it returns null and the page shows the static rings.

import { HALO_FRAGMENT_SHADER, HALO_UNIFORM_NAMES, HALO_VERTEX_SHADER } from "./haloShader";
import type { HaloFocus, HaloUniforms } from "./haloMath";

// One frame's extra inputs that are not part of the blended state.
export type HaloFrame = {
  time: number; // seconds of animation so far
  phase: number; // ring drift so far
  shock: number; // shockwave progress 0..1
  focus: HaloFocus; // focal point, 0..1 from the top left
};

// What the renderer can do. Like a small Python class with three methods.
export type HaloRenderer = {
  resize: (width: number, height: number) => void;
  draw: (uniforms: HaloUniforms, frame: HaloFrame) => void;
  destroy: () => void;
};

type UniformName = (typeof HALO_UNIFORM_NAMES)[number];

// Compiles one shader; returns null (and cleans up) if the graphics driver refuses it.
function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createHaloRenderer(canvas: HTMLCanvasElement): HaloRenderer | null {
  // premultipliedAlpha: our colours are already multiplied by their transparency, so
  // the canvas blends cleanly onto whatever background is behind it.
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const vertex = compile(gl, gl.VERTEX_SHADER, HALO_VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, HALO_FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  // The compiled pieces are inside the program now; we can drop them.
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  // Look up where each uniform lives, like a Python dict {name: location}.
  const where = {} as Record<UniformName, WebGLUniformLocation | null>;
  for (const name of HALO_UNIFORM_NAMES) where[name] = gl.getUniformLocation(program, name);

  // An empty "vertex array": the triangle's corners come from gl_VertexID.
  const vao = gl.createVertexArray();
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  return {
    resize(width, height) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      gl.viewport(0, 0, width, height);
    },
    draw(u, frame) {
      gl.uniform2f(where.uResolution, canvas.width, canvas.height);
      // The page counts y from the top, the graphics card from the bottom.
      gl.uniform2f(where.uFocus, frame.focus.x, 1 - frame.focus.y);
      gl.uniform1f(where.uTime, frame.time);
      gl.uniform1f(where.uPhase, frame.phase);
      gl.uniform1f(where.uShock, frame.shock);
      gl.uniform1f(where.uFreq, u.freq);
      gl.uniform1f(where.uSpread, u.spread);
      gl.uniform1f(where.uIrregular, u.irregular);
      gl.uniform1f(where.uCaution, u.caution);
      gl.uniform1f(where.uDanger, u.danger);
      gl.uniform1f(where.uGlow, u.glow);
      gl.uniform1f(where.uIntensity, u.intensity);
      gl.uniform1f(where.uLight, u.light);
      gl.uniform3fv(where.uAurora1, u.aurora1);
      gl.uniform3fv(where.uAurora2, u.aurora2);
      gl.uniform3fv(where.uAurora3, u.aurora3);
      gl.uniform3fv(where.uAmber, u.amber);
      gl.uniform3fv(where.uRed, u.red);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      // Give the graphics memory back at once instead of waiting for the browser.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
