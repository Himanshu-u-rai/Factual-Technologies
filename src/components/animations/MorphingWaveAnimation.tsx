'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import anime from 'animejs';
import { useSiteContent, WaveAnimationConfig } from '@/lib/site-store';

export interface MorphingWaveAnimationProps {
  className?: string;
  config?: WaveAnimationConfig;
  forceShape?: string;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
}

export interface ShapeDef {
  id: string;
  name: string;
  shortName: string;
  point: (u: number, v: number, R: number) => Point3D;
}

export const SHAPES: ShapeDef[] = [
  {
    id: 'sphere',
    name: 'Classic Sphere',
    shortName: 'Sphere',
    point: (u, v, R) => {
      const phi = (0.04 + u * 0.92) * Math.PI;
      const sinPhi = Math.sin(phi);
      return {
        x: R * sinPhi * Math.cos(v),
        y: -R * Math.cos(phi),
        z: R * sinPhi * Math.sin(v),
      };
    },
  },
  {
    id: 'torus',
    name: 'Torus Ring',
    shortName: 'Torus',
    point: (u, v, R) => {
      const theta = u * Math.PI * 2;
      const majorR = R * 0.72;
      const minorR = R * 0.36;
      const tubeR = majorR + minorR * Math.cos(theta);
      return {
        x: tubeR * Math.cos(v),
        y: minorR * Math.sin(theta) * 1.15,
        z: tubeR * Math.sin(v),
      };
    },
  },
  {
    id: 'hyperboloid',
    name: 'Hourglass Hyperboloid',
    shortName: 'Hourglass',
    point: (u, v, R) => {
      const t = (u - 0.5) * 2;
      const waist = 0.34;
      const r = R * Math.sqrt(waist * waist + t * t * 0.78);
      const twist = t * 0.45;
      return {
        x: r * Math.cos(v + twist),
        y: t * R * 1.05,
        z: r * Math.sin(v + twist),
      };
    },
  },
  {
    id: 'octahedron',
    name: 'Diamond Octahedron',
    shortName: 'Diamond',
    point: (u, v, R) => {
      const t = (u - 0.5) * 2;
      const y = t * R * 1.15;
      const levelR = R * 1.12 * (1 - Math.abs(t) * 0.94);
      const c = Math.cos(v);
      const s = Math.sin(v);
      const diamondMod = 1 / (Math.abs(c) + Math.abs(s) + 0.0001);
      const r = levelR * (0.22 + 0.78 * diamondMod);
      return {
        x: r * c,
        y: y,
        z: r * s,
      };
    },
  },
  {
    id: 'helix',
    name: 'Twisted DNA Helix',
    shortName: 'DNA Helix',
    point: (u, v, R) => {
      const t = (u - 0.5) * 2;
      const twistAngle = t * Math.PI * 2.2;
      const rx = R * 0.92;
      const rz = R * 0.34;
      const lx = rx * Math.cos(v);
      const lz = rz * Math.sin(v);
      return {
        x: lx * Math.cos(twistAngle) - lz * Math.sin(twistAngle),
        y: t * R * 1.12,
        z: lx * Math.sin(twistAngle) + lz * Math.cos(twistAngle),
      };
    },
  },
  {
    id: 'urchin',
    name: 'Star Sea Urchin',
    shortName: 'Star Urchin',
    point: (u, v, R) => {
      const phi = (0.04 + u * 0.92) * Math.PI;
      const sinPhi = Math.sin(phi);
      const spikes = Math.sin(phi * 5) * Math.cos(v * 5);
      const r = R * (0.86 + 0.32 * spikes);
      return {
        x: r * sinPhi * Math.cos(v),
        y: -r * Math.cos(phi),
        z: r * sinPhi * Math.sin(v),
      };
    },
  },
  {
    id: 'cube',
    name: 'Rounded Super-Cube',
    shortName: 'Cube',
    point: (u, v, R) => {
      const phi = (0.04 + u * 0.92) * Math.PI - Math.PI / 2;
      const signPow = (val: number, exp: number) =>
        Math.sign(val) * Math.pow(Math.abs(val), exp);
      const n = 0.38;
      const scale = R * 0.88;
      return {
        x: scale * signPow(Math.cos(phi), n) * signPow(Math.cos(v), n),
        y: scale * signPow(Math.sin(phi), n),
        z: scale * signPow(Math.cos(phi), n) * signPow(Math.sin(v), n),
      };
    },
  },
  {
    id: 'conch',
    name: 'Nautilus Conch Spiral',
    shortName: 'Conch',
    point: (u, v, R) => {
      const turns = u * Math.PI * 2.5;
      const shellRadius = R * (0.14 + 0.72 * Math.pow(u, 0.85));
      const tubeRadius = R * (0.06 + 0.28 * u);
      const centerOffset = shellRadius * 0.58;
      return {
        x: (centerOffset + tubeRadius * Math.cos(v)) * Math.cos(turns),
        y: (u - 0.5) * R * 2.05 + tubeRadius * Math.sin(v) * 0.65,
        z: (centerOffset + tubeRadius * Math.cos(v)) * Math.sin(turns),
      };
    },
  },
  {
    id: 'lotus',
    name: 'Harmonic Lotus',
    shortName: 'Lotus',
    point: (u, v, R) => {
      const phi = (0.06 + u * 0.88) * Math.PI;
      const petalWave = Math.pow(Math.abs(Math.cos(v * 3)), 1.4);
      const flare =
        Math.sin(phi) * (0.72 + 0.48 * petalWave * Math.sin(u * Math.PI));
      return {
        x: R * flare * Math.cos(v),
        y:
          -R * Math.cos(phi) * 0.88 -
          petalWave * Math.sin(u * Math.PI) * R * 0.16,
        z: R * flare * Math.sin(v),
      };
    },
  },
  {
    id: 'trefoil',
    name: 'Trefoil Torus Knot',
    shortName: 'Trefoil',
    point: (u, v, R) => {
      const t = u * Math.PI * 2;
      const scale = R * 0.34;
      const cx = scale * (Math.sin(t) + 2 * Math.sin(2 * t));
      const cy = scale * (Math.cos(t) - 2 * Math.cos(2 * t));
      const cz = scale * -Math.sin(3 * t) * 1.45;
      const tubeR = R * 0.22;
      return {
        x: cx + tubeR * Math.cos(v) * Math.cos(t),
        y: cy + tubeR * Math.sin(v),
        z: cz + tubeR * Math.cos(v) * Math.sin(t),
      };
    },
  },
  {
    id: 'mobius',
    name: 'Twisted Mobius Loop',
    shortName: 'Mobius',
    point: (u, v, R) => {
      const stripWidth = (u - 0.5) * 2;
      const halfAngle = v * 0.5;
      const majorR = R * 0.78;
      const widthScale = R * 0.36 * stripWidth;
      const radial = majorR + widthScale * Math.cos(halfAngle);
      return {
        x: radial * Math.cos(v),
        y: widthScale * Math.sin(halfAngle) * 1.35,
        z: radial * Math.sin(v),
      };
    },
  },
  {
    id: 'amphora',
    name: 'Sculpted Amphora Vase',
    shortName: 'Amphora',
    point: (u, v, R) => {
      const t = (u - 0.5) * 2;
      const belly = 0.78 * Math.exp(-Math.pow((u - 0.42) / 0.28, 2));
      const foot = 0.34 * Math.exp(-Math.pow(u / 0.14, 2));
      const lip = 0.46 * Math.exp(-Math.pow((u - 1.0) / 0.12, 2));
      const profileR = R * (0.24 + belly + foot + lip);
      return {
        x: profileR * Math.cos(v),
        y: t * R * 1.14,
        z: profileR * Math.sin(v),
      };
    },
  },
];

const THEME_PALETTES: Record<string, { r: number; g: number; b: number }[]> = {
  silver: [
    { r: 175, g: 179, b: 190 }, // Architectural Silver (#AFB3BE)
    { r: 202, g: 206, b: 215 }, // Mist Pearl (#CACED7)
    { r: 224, g: 226, b: 233 }, // Soft Alabaster (#E0E2E9)
    { r: 210, g: 213, b: 222 }, // Chalk White (#D2D5DE)
    { r: 162, g: 167, b: 179 }, // Cool Platinum (#A2A7B3)
  ],
  graphite: [
    { r: 51, g: 65, b: 85 }, // Slate 700
    { r: 71, g: 85, b: 105 }, // Slate 600
    { r: 100, g: 116, b: 139 }, // Slate 500
    { r: 30, g: 41, b: 59 }, // Slate 800
    { r: 15, g: 23, b: 42 }, // Slate 900
  ],
  blue: [
    { r: 37, g: 99, b: 235 }, // Blue 600
    { r: 59, g: 130, b: 246 }, // Blue 500
    { r: 96, g: 165, b: 250 }, // Blue 400
    { r: 147, g: 197, b: 253 }, // Blue 300
    { r: 29, g: 78, b: 216 }, // Blue 700
  ],
  dark: [
    { r: 24, g: 24, b: 27 }, // Zinc 900
    { r: 39, g: 39, b: 42 }, // Zinc 800
    { r: 63, g: 63, b: 70 }, // Zinc 700
    { r: 82, g: 82, b: 91 }, // Zinc 600
    { r: 113, g: 113, b: 122 }, // Zinc 500
  ],
};

function interpolatePalette(palette: { r: number; g: number; b: number }[], t: number) {
  const scaled = Math.max(0, Math.min(1, t)) * (palette.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const c1 = palette[idx];
  const c2 = palette[Math.min(palette.length - 1, idx + 1)];
  const r = Math.round(c1.r + (c2.r - c1.r) * frac);
  const g = Math.round(c1.g + (c2.g - c1.g) * frac);
  const b = Math.round(c1.b + (c2.b - c1.b) * frac);
  return { r, g, b };
}

function rotate3D(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number
): Point3D {
  const y1 = y * Math.cos(rx) - z * Math.sin(rx);
  const z1 = y * Math.sin(rx) + z * Math.cos(rx);
  const x1 = x;

  const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
  const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
  const y2 = y1;

  const x3 = x2 * Math.cos(rz) - y2 * Math.sin(rz);
  const y3 = x2 * Math.sin(rz) + y2 * Math.cos(rz);
  const z3 = z2;

  return { x: x3, y: y3, z: z3 };
}

function projectPoint(p3d: Point3D, focalLength: number): ProjectedPoint {
  const scale = focalLength / (focalLength + p3d.z);
  return {
    x: p3d.x * scale,
    y: p3d.y * scale,
    z: p3d.z,
    scale: scale,
  };
}

function pointsToSmoothPath(pts: ProjectedPoint[]): string {
  const len = pts.length;
  if (len === 0) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < len; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % len];
    const midX = (p0.x + p1.x) * 0.5;
    const midY = (p0.y + p1.y) * 0.5;
    d += ` Q ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}, ${midX.toFixed(2)} ${midY.toFixed(2)}`;
  }
  d += ' Z';
  return d;
}

export default function MorphingWaveAnimation({
  className = '',
  config: propConfig,
  forceShape,
}: MorphingWaveAnimationProps) {
  const { content } = useSiteContent();
  const effectiveConfig = propConfig || content.hero?.waveConfig || {
    enabled: true,
    activeShape: 'sphere',
    autoMorph: true,
    ringCount: 22,
    baseRadius: 215,
    focalLength: 680,
    waveSpeed: 1.1,
    waveAmplitude: 1.0,
    autoRotateSpeed: 0.0045,
    wireframeTheme: 'graphite' as const,
    strokeWidth: 1.55,
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  // Dynamic config container ref for render loop
  const cfgRef = useRef({
    ringCount: effectiveConfig.ringCount ?? 22,
    baseRadius: effectiveConfig.baseRadius ?? 215,
    focalLength: effectiveConfig.focalLength ?? 680,
    waveSpeed: effectiveConfig.waveSpeed ?? 1.1,
    waveAmplitude: effectiveConfig.waveAmplitude ?? 1.0,
    autoRotateSpeed: effectiveConfig.autoRotateSpeed ?? 0.0045,
    autoMorph: effectiveConfig.autoMorph ?? true,
    wireframeTheme: effectiveConfig.wireframeTheme || 'graphite',
    strokeWidth: effectiveConfig.strokeWidth ?? 1.55,
    activeShape: forceShape || effectiveConfig.activeShape || 'sphere',
  });

  // Keep cfgRef updated with live properties
  useEffect(() => {
    cfgRef.current = {
      ringCount: effectiveConfig.ringCount ?? 22,
      baseRadius: effectiveConfig.baseRadius ?? 215,
      focalLength: effectiveConfig.focalLength ?? 680,
      waveSpeed: effectiveConfig.waveSpeed ?? 1.1,
      waveAmplitude: effectiveConfig.waveAmplitude ?? 1.0,
      autoRotateSpeed: effectiveConfig.autoRotateSpeed ?? 0.0045,
      autoMorph: effectiveConfig.autoMorph ?? true,
      wireframeTheme: effectiveConfig.wireframeTheme || 'graphite',
      strokeWidth: effectiveConfig.strokeWidth ?? 1.55,
      activeShape: forceShape || effectiveConfig.activeShape || 'sphere',
    };
  }, [effectiveConfig, forceShape]);

  // Explicit finite-state animation & pointer-drag machines inside stateRef
  type MorphPhase =
    | { kind: 'idle'; shapeIdx: number }
    | { kind: 'morphing'; fromIdx: number; toIdx: number; progress: number };

  type DragPhase =
    | { active: false; velX: number; velY: number }
    | { active: true; lastX: number; lastY: number };

  const stateRef = useRef<{
    morph: MorphPhase;
    drag: DragPhase;
    snapShockwave: number;
    wavePhase: number;
    lastWaveCycle: number;
    rotX: number;
    rotY: number;
    rotZ: number;
  }>({
    morph: { kind: 'idle', shapeIdx: 0 },
    drag: { active: false, velX: 0, velY: 0 },
    snapShockwave: 0,
    wavePhase: 0,
    lastWaveCycle: 0,
    rotX: 0.42,
    rotY: 0.0,
    rotZ: -0.18,
  });

  const animRefs = useRef<{
    intro?: unknown;
    morph?: unknown;
    shockwave?: unknown;
    rafId?: number;
  }>({});

  const ringElementsRef = useRef<
    {
      el: SVGPathElement;
      u: number;
      baseColor: { r: number; g: number; b: number };
    }[]
  >([]);

  // Single-writer state transition for shape morphing using Anime.js
  const triggerShapeMorph = (targetIdx: number) => {
    const s = stateRef.current;
    const normalizedTarget = targetIdx % SHAPES.length;
    const currentFromIdx =
      s.morph.kind === 'morphing' && s.morph.progress > 0.5
        ? s.morph.toIdx
        : s.morph.kind === 'morphing'
        ? s.morph.fromIdx
        : s.morph.shapeIdx;

    if (s.morph.kind === 'idle' && normalizedTarget === s.morph.shapeIdx) return;
    if (s.morph.kind === 'morphing' && normalizedTarget === s.morph.toIdx) return;

    if (animRefs.current.morph) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (animRefs.current.morph as any).pause?.();
      animRefs.current.morph = undefined;
    }
    if (animRefs.current.shockwave) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (animRefs.current.shockwave as any).pause?.();
      animRefs.current.shockwave = undefined;
    }

    const nextMorph: MorphPhase = {
      kind: 'morphing',
      fromIdx: currentFromIdx,
      toIdx: normalizedTarget,
      progress: 0,
    };
    s.morph = nextMorph;
    s.snapShockwave = 0;

    // Soft shockwave harmonic swell
    animRefs.current.shockwave = anime({
      targets: s,
      snapShockwave: [0, 0.35, 0],
      duration: 1600,
      easing: 'easeInOutSine',
    });

    // Silky flow morph interpolation
    animRefs.current.morph = anime({
      targets: nextMorph,
      progress: [0, 1],
      duration: 1850,
      easing: 'easeInOutSine',
      complete: () => {
        if (s.morph === nextMorph) {
          s.morph = { kind: 'idle', shapeIdx: normalizedTarget };
        }
      },
    });
  };

  // Re-generate SVG rings whenever ringCount or wireframeTheme changes
  const buildRings = () => {
    const groupEl = groupRef.current;
    if (!groupEl) return;

    groupEl.replaceChildren();
    const rings: {
      el: SVGPathElement;
      u: number;
      baseColor: { r: number; g: number; b: number };
    }[] = [];

    const ringCount = Math.max(12, Math.min(36, cfgRef.current.ringCount));
    const palette = THEME_PALETTES[cfgRef.current.wireframeTheme] || THEME_PALETTES.graphite;

    for (let i = 0; i < ringCount; i++) {
      const u = i / (ringCount - 1);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');

      const color = interpolatePalette(palette, u);
      path.setAttribute('stroke', `rgb(${color.r}, ${color.g}, ${color.b})`);
      path.setAttribute('stroke-width', String(cfgRef.current.strokeWidth));
      path.setAttribute('stroke-opacity', '0.85');

      groupEl.appendChild(path);
      rings.push({
        el: path,
        u: u,
        baseColor: color,
      });
    }

    ringElementsRef.current = rings;
  };

  // Effect to rebuild rings when ringCount or wireframeTheme changes
  useEffect(() => {
    buildRings();
  }, [effectiveConfig.ringCount, effectiveConfig.wireframeTheme, effectiveConfig.strokeWidth]);

  // Effect to handle manual shape switch
  useEffect(() => {
    const targetShapeName = forceShape || effectiveConfig.activeShape;
    if (!targetShapeName) return;
    const targetIdx = SHAPES.findIndex((sh) => sh.id === targetShapeName);
    const currentMorph = stateRef.current.morph;
    const activeIdx =
      currentMorph.kind === 'morphing' ? currentMorph.toIdx : currentMorph.shapeIdx;
    if (targetIdx !== -1 && targetIdx !== activeIdx) {
      triggerShapeMorph(targetIdx);
    }
  }, [effectiveConfig.activeShape, forceShape]);

  // Main render loop
  useEffect(() => {
    buildRings();

    let lastTime = 0;
    const segments = 64;
    const waveFrequency = 0.36;

    const render = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const s = stateRef.current;
      const cfg = cfgRef.current;

      // Advance wave phase
      s.wavePhase += dt * cfg.waveSpeed * 2.4;

      // Track wave cycles for auto-morph
      const currentCycle = Math.floor(s.wavePhase / (Math.PI * 2));
      if (currentCycle > s.lastWaveCycle) {
        s.lastWaveCycle = currentCycle;
        if (cfg.autoMorph && s.morph.kind === 'idle') {
          const nextTarget = (s.morph.shapeIdx + 1) % SHAPES.length;
          triggerShapeMorph(nextTarget);
        }
      }

      // Update 3D rotation
      if (!s.drag.active) {
        s.rotY += cfg.autoRotateSpeed + s.drag.velY;
        s.rotX += s.drag.velX;
        s.drag.velX *= 0.92;
        s.drag.velY *= 0.92;
      }

      const shapeAIdx = s.morph.kind === 'morphing' ? s.morph.fromIdx : s.morph.shapeIdx;
      const shapeBIdx =
        s.morph.kind === 'morphing'
          ? s.morph.toIdx
          : (s.morph.shapeIdx + 1) % SHAPES.length;
      const shapeA = SHAPES[shapeAIdx] || SHAPES[0];
      const shapeB = SHAPES[shapeBIdx] || SHAPES[1];
      const m = s.morph.kind === 'morphing' ? s.morph.progress : 0;
      const rings = ringElementsRef.current;
      const totalRings = rings.length;

      // Render each ring
      for (let i = 0; i < totalRings; i++) {
        const ring = rings[i];
        if (!ring) continue;
        const u = ring.u;

        const waveSignal = Math.sin(i * waveFrequency - s.wavePhase);
        const snapRipple = s.snapShockwave * Math.cos((u - 0.5) * Math.PI) * 0.12;
        const radialPulse = 1 + (waveSignal * 0.14 + snapRipple) * cfg.waveAmplitude;
        const verticalRipple = waveSignal * 6.5 * cfg.waveAmplitude;

        const projectedPoints: ProjectedPoint[] = [];
        let avgZ = 0;

        for (let seg = 0; seg < segments; seg++) {
          const v = (seg / segments) * Math.PI * 2;

          const pA = shapeA.point(u, v, cfg.baseRadius);
          let px = pA.x;
          let py = pA.y;
          let pz = pA.z;

          if (m > 0.0001) {
            const pB = shapeB.point(u, v, cfg.baseRadius);
            px = px + (pB.x - px) * m;
            py = py + (pB.y - py) * m;
            pz = pz + (pB.z - pz) * m;
          }

          px *= radialPulse;
          pz *= radialPulse;
          py += verticalRipple;

          const rotated = rotate3D(px, py, pz, s.rotX, s.rotY, s.rotZ);
          const proj = projectPoint(rotated, cfg.focalLength);
          projectedPoints.push(proj);
          avgZ += rotated.z;
        }

        avgZ /= segments;

        ring.el.setAttribute('d', pointsToSmoothPath(projectedPoints));

        const waveHighlight = Math.min(1, Math.max(0, waveSignal) + s.snapShockwave * 0.65);
        const depthAlpha = Math.max(
          0.36,
          Math.min(0.95, 0.72 - (avgZ / (cfg.baseRadius * 2.4)) * 0.35)
        );
        const finalOpacity = Math.min(1, depthAlpha + waveHighlight * 0.22);
        const strokeWidth = cfg.strokeWidth * (0.85 + waveHighlight * 0.65 * Math.min(1.3, cfg.waveAmplitude));

        const { r, g, b } = ring.baseColor;
        const shadeShift = Math.round(waveHighlight * 36);
        ring.el.setAttribute(
          'stroke',
          `rgb(${Math.max(20, r - shadeShift)}, ${Math.max(25, g - shadeShift)}, ${Math.max(35, b - shadeShift)})`
        );
        ring.el.setAttribute('stroke-opacity', finalOpacity.toFixed(2));
        ring.el.setAttribute('stroke-width', strokeWidth.toFixed(2));

        if (waveHighlight > 0.65 && cfg.waveAmplitude > 0.3) {
          ring.el.setAttribute('filter', 'url(#wave-soft-glow)');
        } else if (ring.el.hasAttribute('filter')) {
          ring.el.removeAttribute('filter');
        }
      }

      animRefs.current.rafId = requestAnimationFrame(render);
    };

    animRefs.current.rafId = requestAnimationFrame(render);

    return () => {
      if (animRefs.current.rafId) {
        cancelAnimationFrame(animRefs.current.rafId);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (animRefs.current.intro as any)?.pause?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (animRefs.current.morph as any)?.pause?.();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (animRefs.current.shockwave as any)?.pause?.();
    };
  }, []);

  // Pointer drag listeners with clean transition between idle/inertial and dragging states
  const onPointerDown = (clientX: number, clientY: number) => {
    stateRef.current.drag = { active: true, lastX: clientX, lastY: clientY };
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    const s = stateRef.current;
    if (!s.drag.active) return;
    const dx = clientX - s.drag.lastX;
    const dy = clientY - s.drag.lastY;
    s.drag.lastX = clientX;
    s.drag.lastY = clientY;

    const velY = dx * 0.0065;
    const velX = dy * 0.0065;
    s.rotY += velY;
    s.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, s.rotX + velX));
  };

  const onPointerUp = () => {
    const s = stateRef.current;
    if (s.drag.active) {
      s.drag = { active: false, velX: 0, velY: 0 };
    }
  };

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center select-none ${className}`}
    >
      <svg
        ref={svgRef}
        viewBox="-285 -285 570 570"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-h-[660px] select-none cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          onPointerDown(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => onPointerMove(e.clientX, e.clientY)}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          onPointerUp();
        }}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      >
        <defs>
          <filter
            id="wave-soft-glow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="1.5"
              stdDeviation="2"
              floodColor="#8A8F9E"
              floodOpacity="0.28"
            />
          </filter>
        </defs>
        <g ref={groupRef} />
      </svg>
    </div>
  );
}
