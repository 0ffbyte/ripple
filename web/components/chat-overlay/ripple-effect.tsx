import { useEffect, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  time as timeNode,
  wgslFn,
  texture,
  sampler,
  uniform,
  uv,
} from "three/tsl";

type Props = {
  image?: string | ImageBitmap | null;
  duration?: number;
  autoplay?: boolean;
  fadeOut?: boolean;
  onDone?: () => void;
};

const DEFAULT_IMG = "https://picsum.photos/seed/5100/1920/1080";

// Tuning knobs
const THICKNESS = 0.12;
const STRENGTH = 0.2;
const ABERRATION = 0.08;
const GLOW = 0.24;
const BLUR = 0.01;
const DELAY = 0.4;
const LEAD = 0; // how far the rainbow wave runs ahead, in radius units
const RAINBOW = 0.08; // rainbow intensity (keep subtle)

const shockwave = wgslFn(/* wgsl */ `
  fn shockwave(
    tex: texture_2d<f32>, samp: sampler, st: vec2f,
    center: vec2f, cover: vec2f, aspect: f32,
    radius: f32, thickness: f32, strength: f32, aberration: f32,
    glow: f32, blur: f32, delay: f32, lead: f32, rainbow: f32, time: f32
  ) -> vec4f {
    var d = st - center;
    d.x *= aspect;
    let dist = length(d);
    let ang = atan2(d.y, d.x);

    let dn = d / (dist + 1e-5);
    var dir = dn;      dir.x /= aspect;                     // ring normal in UV space
    var tng = vec2f(-dn.y, dn.x); tng.x /= aspect;          // ring tangent in UV space

    var waveSum = 0.0;
    var energy = 0.0;
    var blurEnergy = 0.0;
    var frontSum = 0.0;
    var rimSum = 0.0;
    var coreSum = 0.0;
    var haloSum = 0.0;
    var darken = 1.0;

    // ---- Two main waves, each with its own character ----
    for (var w = 0; w < 2; w++) {
      let fw = f32(w);
      let r = radius - fw * delay;
      let amp = 1.0 - fw * 0.35;
      let phase = fw * 1.7;
      let thick = thickness * (1.0 + fw * 0.7);   // 2nd wave is wider and softer
      let blurMul = 1.0 + fw * 1.2;               // and blurrier

      let wobble = sin(ang * (5.0 + fw * 2.0) + time * 2.0 + phase) * 0.012
                 + sin(ang * (11.0 - fw * 3.0) - time * 3.0 + phase) * 0.006;
      let t = (dist - r * (1.0 + wobble)) / thick;

      let k = select(1.0, 4.0, t > 0.0);
      let front = exp(-t * t * k);

      let behind = max(-t, 0.0);
      let trail = sin(behind * (10.0 - fw * 3.0)) * exp(-behind * 1.1) * smoothstep(0.0, 0.4, behind);

      let life = (1.0 - smoothstep(0.2, 1.4, r)) * smoothstep(0.0, 0.05, r);

      let e = (front + abs(trail) * 0.35) * life * amp;
      waveSum    += (front + trail * 0.35) * life * amp;
      energy     += e;
      blurEnergy += e * blurMul;
      frontSum   += front * life * amp;

      rimSum  += front * life * amp;
      coreSum += pow(front, 6.0) * life * amp * (1.0 - fw * 0.5);
      haloSum += exp(-abs(t) * 0.7) * 0.25 * life * amp;

      darken *= 1.0 - smoothstep(0.0, 1.0, behind) * exp(-behind * 2.0) * 0.15 * life * amp;
    }

    // ---- Rainbow lead wave: wide, soft, runs ahead of the first ring ----
    let rl = radius + lead;
    let lwob = sin(ang * 3.0 + time * 1.5) * 0.01;
    let tl = (dist - rl * (1.0 + lwob)) / (thickness * 1.5);
    let band = exp(-tl * tl * 1.6);
    let leadLife = (1.0 - smoothstep(0.2, 1.4, rl)) * smoothstep(0.0, 0.08, rl);
    let lb = band * leadLife;

    // Hue sweeps across the band width, drifting slowly around the ring
    let hue = tl * 0.45 + ang * 0.159 + time * 0.15;
    let spectrum = 0.5 + 0.5 * cos(6.28318 * (hue + vec3f(0.0, 0.33, 0.67)));

    waveSum    += lb * 0.25;       // faint refraction from the lead
    energy     += lb * 0.3;
    blurEnergy += lb * 0.3;
    frontSum   += lb * 0.3;

    // ---- Displacement ----
    let o = dir * waveSum * strength * cover;
    let base = (st - 0.5) * cover + 0.5;

    let ab = aberration * (0.5 + min(frontSum, 1.5));

    // ---- Frosted blur: elliptical spiral disc, long axis along the ring normal ----
    let spread = blur * min(blurEnergy, 2.0);
    var col = vec3f(0.0);
    var wsum = 0.0;
    for (var i = 0; i < 8; i++) {
      let a = f32(i) * 2.39996;                    // golden angle
      let rr = sqrt((f32(i) + 0.5) / 8.0);
      let wt = exp(-rr * rr * 2.0);
      let so = (dir * cos(a) + tng * sin(a) * 0.35) * rr * spread * cover;
      col += wt * vec3f(
        textureSample(tex, samp, base - o * (1.0 + ab) + so).r,
        textureSample(tex, samp, base - o + so).g,
        textureSample(tex, samp, base - o * (1.0 - ab) + so).b
      );
      wsum += wt;
    }
    col /= wsum;

    // ---- Glow and color ----
    let tint = vec3f(0.55, 0.78, 1.0);

    col += col * rimSum * glow * 1.1;
    col += tint * (rimSum * 0.4 + haloSum) * glow;
    col += vec3f(1.0) * coreSum * glow * 0.5;

    // Rainbow: screen-style add so it stays luminous but never clips harshly
    let rb = spectrum * lb * rainbow;
    col = 1.0 - (1.0 - col) * (1.0 - rb);
    // A whisper of spectrum on the main fronts too
    col += spectrum * rimSum * rainbow * 0.25;

    col *= darken;

    return vec4f(col, 1.0);
  }
`);

export default function RippleEffect({
  image = DEFAULT_IMG,
  duration = 2800,
  autoplay = true,
  fadeOut = true,
  onDone,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<((x: number, y: number) => void) | null>(null);

  // Latest props without re-running the GPU setup effect
  const opts = useRef({ duration, autoplay, fadeOut, onDone });
  opts.current = { duration, autoplay, fadeOut, onDone };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      let map: THREE.Texture;
      if (typeof image === "string") {
        map = await new THREE.TextureLoader()
          .setCrossOrigin("anonymous")
          .loadAsync(image);
      } else if (image instanceof ImageBitmap) {
        map = new THREE.Texture(image);
        map.needsUpdate = true;
      } else {
        throw new Error("Unsupported image type for RippleEffect");
      }

      map.colorSpace = THREE.SRGBColorSpace; // sampled linear, re-encoded on output

      const renderer = new THREE.WebGPURenderer({ antialias: false });
      await renderer.init();
      if (disposed) {
        renderer.dispose();
        map.dispose();
        return;
      }
      const canvas = renderer.domElement;
      canvas.style.cssText = "display:block;width:100%;height:100%";
      host.appendChild(canvas);

      const U = {
        center: uniform(new THREE.Vector2(0.5, 0.5)),
        cover: uniform(new THREE.Vector2(1, 1)),
        aspect: uniform(1),
        radius: uniform(0),
        strength: uniform(0),
      };

      const material = new THREE.MeshBasicNodeMaterial();
      material.colorNode = shockwave({
        tex: texture(map),
        samp: sampler(map),
        st: uv(),
        center: U.center,
        cover: U.cover,
        aspect: U.aspect,
        radius: U.radius,
        thickness: uniform(THICKNESS),
        strength: U.strength,
        aberration: uniform(ABERRATION),
        glow: uniform(GLOW),
        blur: uniform(BLUR),
        delay: uniform(DELAY),
        lead: uniform(LEAD),
        rainbow: uniform(RAINBOW),
        time: timeNode, // TSL's built-in elapsed-seconds node
      }) as unknown as NonNullable<typeof material.colorNode>; // wgslFn is untyped

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      quad.frustumCulled = false;
      scene.add(quad);

      const draw = (
        cx: number,
        cy: number,
        radius: number,
        strength: number,
      ) => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        if (
          canvas.width !== Math.round(w * dpr) ||
          canvas.height !== Math.round(h * dpr)
        ) {
          renderer.setSize(w, h, false);
        }
        const ca = w / h;

        const ia =
          (map.image as { width: number; height: number }).width /
          (map.image as { width: number; height: number }).height;

        if (ca > ia) U.cover.value.set(1, ia / ca);
        else U.cover.value.set(ca / ia, 1);
        U.aspect.value = ca;
        U.center.value.set(cx, 1 - cy); // pointer space is y-down, uv space is y-up
        U.radius.value = radius;
        U.strength.value = strength;
        renderer.render(scene, camera);
      };

      const play = (cx: number, cy: number) => {
        cancelAnimationFrame(raf);
        canvas.style.transition = "none";
        canvas.style.opacity = "1";

        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          opts.current.onDone?.();
          return;
        }

        // Radius needed for the ring to clear the farthest corner
        const aspect = host.clientWidth / host.clientHeight;
        const maxR =
          Math.hypot(Math.max(cx, 1 - cx) * aspect, Math.max(cy, 1 - cy)) +
          THICKNESS * 2;
        const ms = opts.current.duration;
        const start = performance.now();

        const tick = (now: number) => {
          const t = Math.min((now - start) / ms, 1);
          const eased = 1 - (1 - t) ** 3; // easeOutCubic
          draw(cx, cy, eased * maxR, STRENGTH * (1 - t) ** 2);
          if (t < 1) {
            raf = requestAnimationFrame(tick);
            return;
          }
          if (opts.current.fadeOut) {
            canvas.style.transition = "opacity 250ms ease-out";
            canvas.style.opacity = "0";
          }
          opts.current.onDone?.();
        };
        raf = requestAnimationFrame(tick);
      };

      draw(0.5, 0.5, 0, 0); // static first frame, identical to the source image
      playRef.current = play;
      if (opts.current.autoplay) play(0.5, 1);

      cleanup = () => {
        cancelAnimationFrame(raf);
        canvas.remove();
        quad.geometry.dispose();
        material.dispose();
        map.dispose();
        renderer.dispose();
      };
    })().catch(console.error);

    return () => {
      disposed = true;
      playRef.current = null;
      cleanup();
    };
  }, [image]);

  return (
    <div
      ref={hostRef}
      className="w-full h-full absolute inset-0 pointer-events-none"
    />
  );
}
