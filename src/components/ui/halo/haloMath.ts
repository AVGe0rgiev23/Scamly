// Pure helpers for the „Ореол“ (halo) motif: colours per theme, the shader settings for
// each state, smooth blending between two states, and the "can this device animate?"
// decision. No React and no browser objects here, so every function is easy to unit-test.

// The four moods of the halo. A TypeScript "union of strings" works like a Python
// Literal["idle", "calm", "caution", "danger"].
export type HaloState = "idle" | "calm" | "caution" | "danger";

// The theme a page can ask for; "auto" means "read it from the page".
export type HaloThemeChoice = "dark" | "light" | "auto";
export type HaloTheme = "dark" | "light";

// A colour as three numbers from 0 to 1 (red, green, blue), like a Python tuple
// (r, g, b). The shader wants colours in this form.
export type Rgb = [number, number, number];

// Every number the shader needs to draw one moment of the halo. Like a Python dataclass
// with only fields. All of them are blended smoothly when the state changes.
export type HaloUniforms = {
  freq: number; // rings per unit of distance: more = tighter rings
  speed: number; // how fast the rings drift outward (phase per second)
  spread: number; // how far from the centre the rings stay visible
  irregular: number; // 0 = even rings, 1 = wobbly and uneven (caution)
  caution: number; // 0..1: how much the colour turns amber
  danger: number; // 0..1: how much the rings collapse into one red ring
  glow: number; // strength of the soft light at the centre
  intensity: number; // overall strength (the component's `intensity` prop)
  light: number; // 0 = dark theme, 1 = light theme (changes how light is mixed)
  aurora1: Rgb; // inner ring colour
  aurora2: Rgb; // middle ring colour
  aurora3: Rgb; // outer ring colour
  amber: Rgb; // caution colour
  red: Rgb; // danger colour
};

// Turns "#8B7BFF" into [0.545, 0.482, 1]. Like Python's int("8B", 16) / 255 for each pair.
export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const red = parseInt(clean.slice(0, 2), 16) / 255;
  const green = parseInt(clean.slice(2, 4), 16) / 255;
  const blue = parseInt(clean.slice(4, 6), 16) / 255;
  return [red, green, blue];
}

// The brand colours of the halo. The shader cannot read CSS variables, so it uses this
// table; it must equal the tokens in globals.css (--halo-1/2/3, --caution-solid,
// --danger-solid per theme), which src/app/tokens.test.ts checks. HaloRings reads the
// CSS variables directly (--caution and --danger are aliases of the *-solid tokens).
export const HALO_PALETTE = {
  dark: {
    halo1: "#8B7BFF",
    halo2: "#4CC9FF",
    halo3: "#6EF3C5",
    caution: "#FFB547",
    danger: "#FF4D5E",
  },
  light: {
    halo1: "#5B4BFF",
    halo2: "#0EA5E9",
    halo3: "#10B981",
    caution: "#FFB547",
    danger: "#D42A3D",
  },
} as const;

// The shape of the rings for each state (colours are added by haloUniforms below).
type StateShape = Pick<
  HaloUniforms,
  "freq" | "speed" | "spread" | "irregular" | "caution" | "danger" | "glow"
>;

export const STATE_SHAPES: Record<HaloState, StateShape> = {
  // Waiting: wide, slow, evenly spaced aurora rings.
  idle: { freq: 7, speed: 0.12, spread: 0.95, irregular: 0, caution: 0, danger: 0, glow: 0.55 },
  // Calm (e.g. after a green verdict): even wider, slower, a little brighter.
  calm: { freq: 6, speed: 0.08, spread: 1.05, irregular: 0, caution: 0, danger: 0, glow: 0.7 },
  // Caution: rings tighten, wobble and turn amber.
  caution: { freq: 13, speed: 0.3, spread: 0.7, irregular: 1, caution: 1, danger: 0, glow: 0.75 },
  // Danger: the rings fade away and one bright red ring closes around the centre.
  danger: { freq: 18, speed: 0.45, spread: 0.45, irregular: 0, caution: 0, danger: 1, glow: 0.9 },
};

// Keeps a number between low and high, like Python's max(low, min(high, value)).
export function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

// The full set of shader numbers for a state, theme and intensity.
export function haloUniforms(state: HaloState, theme: HaloTheme, intensity: number): HaloUniforms {
  const colours = HALO_PALETTE[theme];
  return {
    ...STATE_SHAPES[state], // "..." copies all fields, like Python's {**shape}
    intensity: clamp(Number.isFinite(intensity) ? intensity : 1, 0, 1),
    light: theme === "light" ? 1 : 0,
    aurora1: hexToRgb(colours.halo1),
    aurora2: hexToRgb(colours.halo2),
    aurora3: hexToRgb(colours.halo3),
    amber: hexToRgb(colours.caution),
    red: hexToRgb(colours.danger),
  };
}

// Straight-line blend: t = 0 gives a, t = 1 gives b.
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Starts slow, speeds up, ends slow: the change between states feels soft, not robotic.
export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

// Blends every field of two uniform sets. Used on every frame of a state change.
export function mixUniforms(a: HaloUniforms, b: HaloUniforms, t: number): HaloUniforms {
  return {
    freq: lerp(a.freq, b.freq, t),
    speed: lerp(a.speed, b.speed, t),
    spread: lerp(a.spread, b.spread, t),
    irregular: lerp(a.irregular, b.irregular, t),
    caution: lerp(a.caution, b.caution, t),
    danger: lerp(a.danger, b.danger, t),
    glow: lerp(a.glow, b.glow, t),
    intensity: lerp(a.intensity, b.intensity, t),
    light: lerp(a.light, b.light, t),
    aurora1: lerpRgb(a.aurora1, b.aurora1, t),
    aurora2: lerpRgb(a.aurora2, b.aurora2, t),
    aurora3: lerpRgb(a.aurora3, b.aurora3, t),
    amber: lerpRgb(a.amber, b.amber, t),
    red: lerpRgb(a.red, b.red, t),
  };
}

// How long a change between two states takes, in milliseconds. Danger is a bit
// quicker: the shield "snaps" shut.
export function transitionMs(to: HaloState): number {
  return to === "danger" ? 850 : 1100;
}

// How long the single shockwave of the danger state travels, in seconds.
export const SHOCKWAVE_SECONDS = 1.4;

// Progress of the shockwave from 0 (just started) to 1 (finished, invisible).
export function shockProgress(nowSeconds: number, startSeconds: number | null): number {
  if (startSeconds === null) return 1;
  return clamp((nowSeconds - startSeconds) / SHOCKWAVE_SECONDS, 0, 1);
}

// What the device can afford:
// - "fallback": no WebGL2 or a weak device → the static CSS/SVG rings (HaloRings);
// - "still": the person asked for less motion → draw one frame of the shader and stop;
// - "animated": the full live shader.
export type RenderMode = "animated" | "still" | "fallback";

export type DeviceInfo = {
  webgl2: boolean;
  reducedMotion: boolean;
  hardwareConcurrency?: number; // CPU cores (navigator.hardwareConcurrency)
  deviceMemory?: number; // GB of RAM, only in Chrome (navigator.deviceMemory)
};

export function isLowEndDevice(info: DeviceInfo): boolean {
  const fewCores = info.hardwareConcurrency !== undefined && info.hardwareConcurrency <= 4;
  const littleMemory = info.deviceMemory !== undefined && info.deviceMemory <= 4;
  return fewCores || littleMemory;
}

export function decideRenderMode(info: DeviceInfo): RenderMode {
  if (!info.webgl2 || isLowEndDevice(info)) return "fallback";
  if (info.reducedMotion) return "still";
  return "animated";
}

// The theme to draw: a fixed choice wins; for "auto", the nearest data-theme attribute
// on the page wins; with none, the phone's own light/dark setting decides.
export function resolveTheme(
  choice: HaloThemeChoice,
  dataTheme: string | null,
  prefersDark: boolean,
): HaloTheme {
  if (choice !== "auto") return choice;
  if (dataTheme === "dark" || dataTheme === "light") return dataTheme;
  return prefersDark ? "dark" : "light";
}

// Size of the canvas in real pixels. We never draw above 1 pixel per CSS pixel (sharp
// screens with 2× or 3× would cost 4× or 9× the work for a soft glow nobody can tell
// apart), and we cap the total so a huge monitor stays cheap.
export const MAX_PIXELS = 1920 * 1080;

export function canvasPixelSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): { width: number; height: number } {
  let scale = Math.min(devicePixelRatio > 0 ? devicePixelRatio : 1, 1);
  const pixels = cssWidth * cssHeight * scale * scale;
  if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels);
  return {
    width: Math.max(1, Math.round(cssWidth * scale)),
    height: Math.max(1, Math.round(cssHeight * scale)),
  };
}

// Where the rings start, as fractions of the box (0,0 = top left, 1,1 = bottom right).
export type HaloFocus = { x: number; y: number };

// Default: a little left of the centre, so the hero text on the right stays readable.
export const DEFAULT_FOCUS: HaloFocus = { x: 0.38, y: 0.5 };
