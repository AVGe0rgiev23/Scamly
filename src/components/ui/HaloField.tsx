"use client";

// HaloField: the live „Ореол“ (halo) background. A WebGL2 shader draws soft rings that
// spread from one point like a sound wave; the `state` prop turns them calm (aurora),
// caution (amber, uneven) or danger (one red ring closes like a shield). Changes blend
// over about a second. It is decorative only (aria-hidden), never holds text.
//
// Safety and speed: at most 1 real pixel per CSS pixel; paused when off-screen or when
// the tab is hidden; one still frame for reduced motion; the static HaloRings on weak
// devices, without WebGL2 or if the graphics card drops the context.
//
// How to use it (it is a client component, so load it lazily from a client island):
//   "use client";
//   import dynamic from "next/dynamic";
//   const HaloField = dynamic(() => import("@/components/ui/HaloField"), { ssr: false });
//   <div className="relative">
//     <HaloField state="idle" className="absolute inset-0" />
//     …content…
//   </div>
// `ssr: false` is not allowed in Server Components: put the line above in a small
// "use client" file and render that from the page.

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { cn } from "./cn";
import { HaloRings } from "./HaloRings";
import {
  DEFAULT_FOCUS,
  canvasPixelSize,
  decideRenderMode,
  easeInOutCubic,
  haloUniforms,
  mixUniforms,
  resolveTheme,
  shockProgress,
  transitionMs,
  type HaloFocus,
  type HaloState,
  type HaloTheme,
  type HaloThemeChoice,
  type HaloUniforms,
  type DeviceInfo,
} from "./halo/haloMath";
import { createHaloRenderer } from "./halo/haloRenderer";

export type HaloFieldProps = {
  state: HaloState;
  intensity?: number; // 0..1, default 1
  className?: string;
  theme?: HaloThemeChoice; // default "auto" (reads data-theme / the phone's setting)
  focus?: HaloFocus; // where the rings start, 0..1 from the top left
};

// Everything the animation loop needs between frames. It lives inside the effect (not
// in React state), so changing it never re-renders the component; like a Python object.
type Live = {
  state: HaloState;
  theme: HaloTheme;
  intensity: number;
  focus: HaloFocus;
  from: HaloUniforms; // where the current blend started
  to: HaloUniforms; // where it is going
  current: HaloUniforms; // what is on screen now
  blendStart: number; // performance.now() when the blend started
  blendMs: number;
  shockStart: number | null; // animation seconds when danger began
};

// Reads the nearest data-theme attribute and the phone's setting for "auto".
function readTheme(choice: HaloThemeChoice, element: Element | null): HaloTheme {
  const owner = element?.closest("[data-theme]") ?? null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveTheme(choice, owner?.getAttribute("data-theme") ?? null, prefersDark);
}

// navigator.deviceMemory exists only in Chrome, so TypeScript does not know it.
function readDeviceMemory(): number | undefined {
  const value = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof value === "number" ? value : undefined;
}

// What the browser tells us about the device (read fresh each time).
function readDevice(): DeviceInfo {
  return {
    webgl2: typeof WebGL2RenderingContext !== "undefined",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    hardwareConcurrency: navigator.hardwareConcurrency || undefined,
    deviceMemory: readDeviceMemory(),
  };
}

// For useSyncExternalStore: cores, memory and WebGL2 support never change while the
// page is open, so there is nothing to subscribe to.
function noChanges(): () => void {
  return () => {};
}

function readNeedsFallback(): boolean {
  return decideRenderMode(readDevice()) === "fallback";
}

export function HaloField({
  state,
  intensity = 1,
  className,
  theme = "auto",
  focus = DEFAULT_FOCUS,
}: HaloFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Weak device or no WebGL2 → static rings. useSyncExternalStore reads a value from
  // outside React, like a getter; on the server it answers false (try the canvas).
  const weakDevice = useSyncExternalStore(noChanges, readNeedsFallback, () => false);
  // The graphics card refused the shader or took the context away.
  const [glFailed, setGlFailed] = useState(false);
  const fallback = weakDevice || glFailed;
  // Set by the main effect: "the props changed, react to them".
  const onPropsRef = useRef<(() => void) | null>(null);
  // Latest props, readable inside the long-lived effect without restarting it.
  const propsRef = useRef({ state, intensity, theme, focus });

  // Main effect: runs once on mount (and again only if we switch to the fallback, when
  // there is no canvas any more), sets up WebGL and the loop, cleans up on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mode = decideRenderMode(readDevice());
    if (mode === "fallback") return; // the static rings are shown instead
    const renderer = createHaloRenderer(canvas);
    if (!renderer) {
      // Switch to the static rings right after this effect (not inside it).
      queueMicrotask(() => setGlFailed(true));
      return;
    }

    let still = mode === "still";
    const first = propsRef.current;
    const firstTheme = readTheme(first.theme, canvas);
    const startUniforms = haloUniforms(first.state, firstTheme, first.intensity);
    const live: Live = {
      state: first.state,
      theme: firstTheme,
      intensity: first.intensity,
      focus: first.focus,
      from: startUniforms,
      to: startUniforms,
      current: startUniforms,
      blendStart: 0,
      blendMs: 1,
      shockStart: null,
    };

    let frameId = 0; // id from requestAnimationFrame, to cancel it
    let onScreen = true;
    let time = 0; // seconds of animation (stops while paused)
    let phase = 0; // ring drift, speed added up frame by frame
    let lastNow = 0;

    function drawOnce() {
      const box = canvas!.getBoundingClientRect();
      const size = canvasPixelSize(box.width, box.height, window.devicePixelRatio || 1);
      renderer!.resize(size.width, size.height);
      renderer!.draw(live.current, {
        time,
        phase,
        shock: shockProgress(time, live.shockStart),
        focus: live.focus,
      });
    }

    function tick(now: number) {
      frameId = 0;
      // Time step since the last frame, capped so a pause never causes a jump.
      const dt = lastNow === 0 ? 0 : Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      const blend = easeInOutCubic((now - live.blendStart) / live.blendMs);
      live.current = mixUniforms(live.from, live.to, blend);
      time += dt;
      phase += dt * live.current.speed;
      drawOnce();
      startLoop();
    }

    function shouldRun(): boolean {
      return !still && onScreen && document.visibilityState === "visible";
    }

    function startLoop() {
      if (frameId === 0 && shouldRun()) frameId = requestAnimationFrame(tick);
    }

    function stopLoop() {
      if (frameId !== 0) cancelAnimationFrame(frameId);
      frameId = 0;
      lastNow = 0;
    }

    // Reduced motion: jump straight to the final picture and draw it once.
    function drawStill() {
      live.current = live.to;
      live.shockStart = null;
      drawOnce();
    }

    // Called when state, theme, intensity or focus change.
    function onProps() {
      const next = propsRef.current;
      const nextTheme = readTheme(next.theme, canvas);
      const target = haloUniforms(next.state, nextTheme, next.intensity);
      if (next.state === "danger" && live.state !== "danger") live.shockStart = time;
      live.from = live.current;
      live.to = target;
      live.blendStart = performance.now();
      live.blendMs = transitionMs(next.state);
      live.state = next.state;
      live.theme = nextTheme;
      live.intensity = next.intensity;
      live.focus = next.focus;
      if (still) drawStill();
      else startLoop();
    }
    onPropsRef.current = onProps;

    // Pause when scrolled away…
    const visibility = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      if (onScreen) startLoop();
      else stopLoop();
    });
    visibility.observe(canvas);

    // …and when the tab is hidden.
    function onVisibilityChange() {
      if (document.visibilityState === "visible") startLoop();
      else stopLoop();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Resizing: in still mode redraw at once; in animated mode the next frame resizes.
    const resize = new ResizeObserver(() => {
      if (still) drawStill();
    });
    resize.observe(canvas);

    // The person turns reduced motion on (or off) while the page is open.
    function onMotionChange() {
      still = reducedMotionQuery.matches;
      if (still) {
        stopLoop();
        drawStill();
      } else startLoop();
    }
    reducedMotionQuery.addEventListener("change", onMotionChange);

    // The site's theme switch changes <html data-theme>; the phone may switch too.
    const themeWatch = new MutationObserver(onProps);
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    darkQuery.addEventListener("change", onProps);

    // The graphics card can take the context away (driver reset, too many tabs).
    function onContextLost() {
      stopLoop();
      setGlFailed(true);
    }
    canvas.addEventListener("webglcontextlost", onContextLost);

    if (still) drawStill();
    else startLoop();

    // Cleanup: stop everything and give the graphics memory back.
    return () => {
      stopLoop();
      onPropsRef.current = null;
      visibility.disconnect();
      resize.disconnect();
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotionQuery.removeEventListener("change", onMotionChange);
      darkQuery.removeEventListener("change", onProps);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      renderer.destroy();
    };
  }, [fallback]);

  // When a prop changes, start a smooth blend to the new picture.
  const focusX = focus.x;
  const focusY = focus.y;
  useEffect(() => {
    propsRef.current = { state, intensity, theme, focus: { x: focusX, y: focusY } };
    onPropsRef.current?.();
  }, [state, intensity, theme, focusX, focusY]);

  if (fallback) {
    const ringsStyle: CSSProperties = {
      position: "absolute",
      left: `${focusX * 100}%`,
      top: `${focusY * 100}%`,
      transform: "translate(-50%, -50%)",
    };
    return (
      <div
        aria-hidden="true"
        className={cn("pointer-events-none overflow-hidden", className)}
        data-theme={theme === "auto" ? undefined : theme}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <HaloRings
            state={state}
            size="min(120vmin, 1100px)"
            animated={false}
            style={ringsStyle}
          />
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn("pointer-events-none overflow-hidden", className)}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

export default HaloField;
