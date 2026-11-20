// The GLSL source of the halo: a tiny program the graphics card runs once for every
// pixel of the canvas, about 60 times per second. It lives in plain strings because
// WebGL compiles it in the browser.
//
// What the fragment shader computes, in plain words:
//   1. distance: how far this pixel is from the focal point (the "phone");
//   2. wobble: in caution, bend that distance a little so the rings look uneven;
//   3. sine rings: put the distance into a cosine wave → bright lines every few steps,
//      drifting outward over time like a sound wave;
//   4. falloff: fade the rings out with distance so they melt into the page;
//   5. shield: in danger, one bright closed ring (and one shockwave) replaces them;
//   6. colour: aurora gradient by distance, blended to amber (caution) or red (danger);
//   7. grain: a whisper of noise so the gradients never band.
// Defense in two sentences: "For every pixel the graphics card measures its distance
// from the centre and turns that distance into a wave, so equal distances make rings.
// We only change a few numbers (ring count, wobble, colour mix) and the card redraws
// the whole picture 60 times per second, so states blend smoothly."

// The vertex shader draws one big triangle that covers the whole canvas. It needs no
// data from JavaScript: gl_VertexID (0, 1, 2) picks the corner.
export const HALO_VERTEX_SHADER = `#version 300 es
void main() {
  vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}
`;

// Names of every uniform (value sent from JavaScript) the fragment shader reads.
// The renderer looks each one up by name; a test checks that both lists agree.
export const HALO_UNIFORM_NAMES = [
  "uResolution",
  "uFocus",
  "uTime",
  "uPhase",
  "uFreq",
  "uSpread",
  "uIrregular",
  "uCaution",
  "uDanger",
  "uGlow",
  "uIntensity",
  "uLight",
  "uShock",
  "uAurora1",
  "uAurora2",
  "uAurora3",
  "uAmber",
  "uRed",
] as const;

export const HALO_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;   // canvas size in pixels
uniform vec2 uFocus;        // focal point, 0..1 (y measured from the bottom)
uniform float uTime;        // seconds since start (for wobble, pulse, grain)
uniform float uPhase;       // how far the rings have drifted (speed added up over time)
uniform float uFreq;        // rings per unit of distance
uniform float uSpread;      // how far the rings reach
uniform float uIrregular;   // 0 = even rings, 1 = uneven (caution)
uniform float uCaution;     // 0..1 amber mix
uniform float uDanger;      // 0..1 collapse into the red shield
uniform float uGlow;        // soft light in the centre
uniform float uIntensity;   // overall strength 0..1
uniform float uLight;       // 0 = dark theme, 1 = light theme
uniform float uShock;       // shockwave progress 0..1 (1 = finished)
uniform vec3 uAurora1;      // inner colour
uniform vec3 uAurora2;      // middle colour
uniform vec3 uAurora3;      // outer colour
uniform vec3 uAmber;
uniform vec3 uRed;

out vec4 outColor;

const float TAU = 6.2831853;

// A cheap "random" number 0..1 for a 2D point (same input → same output).
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// A thin soft line at distance "center" from the focal point, "width" wide.
float softLine(float d, float center, float width) {
  float x = (d - center) / width;
  return exp(-x * x);
}

void main() {
  // 1. Distance from the focal point. Dividing by the height keeps rings round on any
  //    screen shape.
  vec2 p = (gl_FragCoord.xy - uFocus * uResolution) / uResolution.y;
  float d = length(p);
  float angle = atan(p.y, p.x);

  // 2. Caution wobble: push the distance in and out a little depending on the angle,
  //    so the rings are no longer perfect circles.
  float wobble = 0.03 * sin(angle * 3.0 + uTime * 0.9)
               + 0.02 * sin(angle * 7.0 - uTime * 1.3 + d * 6.0);
  //    The wobble fades out near the centre, where a small bend would look like a knot.
  float dw = d + uIrregular * wobble * smoothstep(0.02, 0.3, d);

  // 3. Sine rings: a cosine of the distance gives a wave; raising it to a power keeps
  //    only the crests, which become thin bright rings. uPhase makes them travel out.
  float wavePos = dw * uFreq - uPhase;
  float wave = 0.5 + 0.5 * cos(TAU * wavePos);
  float rings = pow(wave, 10.0);
  //    In caution each ring gets its own random brightness → irregular spacing feel.
  float ringId = floor(wavePos + 0.5);
  rings *= mix(1.0, 0.25 + 0.75 * hash(vec2(ringId, 3.7)), uIrregular);

  // 4. Smooth falloff: strong near the centre, gone far away (a Gaussian bell), and a
  //    soft glow right at the focal point.
  float envelope = exp(-(d * d) / (uSpread * uSpread)) * smoothstep(0.0, 0.05, d);
  float core = exp(-(d * d) / (0.02 + 0.03 * uSpread)) * uGlow * 0.45;
  float field = rings * envelope * (1.0 - 0.96 * uDanger) + core * (1.0 - 0.6 * uDanger);

  // 5. Danger: one closed ring shrinks from wide to tight and gets bright, like a
  //    shield closing. A single shockwave runs outward once when danger starts.
  float shieldRadius = mix(0.6, 0.24, uDanger);
  float pulse = 0.92 + 0.08 * sin(uTime * 2.2);
  float shield = (softLine(d, shieldRadius, 0.012) + 0.4 * softLine(d, shieldRadius, 0.07))
               * smoothstep(0.0, 1.0, uDanger) * pulse;
  float shockRadius = mix(shieldRadius, 1.6, uShock);
  float shock = softLine(d, shockRadius, 0.035) * (1.0 - uShock) * step(uShock, 0.999) * uDanger;

  // 6. Colour: inner → middle → outer aurora colour by distance (with a slow turn by
  //    angle), then blended towards amber (caution) and red (danger).
  float t = clamp(d / max(uSpread, 0.1) + 0.12 * sin(angle + uTime * 0.15), 0.0, 1.0);
  vec3 aurora = mix(uAurora1, uAurora2, smoothstep(0.0, 0.5, t));
  aurora = mix(aurora, uAurora3, smoothstep(0.5, 1.0, t));
  vec3 colour = mix(aurora, uAmber, uCaution);
  colour = mix(colour, uRed, uDanger);

  float redLight = shield + shock;
  float alpha = clamp(field + redLight, 0.0, 1.0);
  vec3 rgb = colour * field + uRed * redLight;
  //    In the dark theme the brightest line of the shield gets a white-hot centre.
  rgb += vec3(1.0) * softLine(d, shieldRadius, 0.005) * uDanger * 0.5 * (1.0 - uLight);

  // 7. Grain: tiny random brightness changes per pixel, so gradients never band.
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5;
  alpha = clamp(alpha + grain * 0.04 * alpha, 0.0, 1.0);

  // Transparent background: the colour is "premultiplied" (already multiplied by its
  // own transparency). On light pages light must not add up beyond the colour itself.
  alpha *= uIntensity;
  rgb *= uIntensity;
  rgb = mix(rgb, min(rgb, vec3(alpha)), uLight);
  outColor = vec4(rgb, alpha);
}
`;
