import React, { useEffect, useRef } from 'react';
import { cvData } from '../data/cvData';
import { useApp } from '../context/AppContext';

const SkillsGraph2D = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { focusMode } = useApp();
  const focusModeRef = useRef(focusMode);

  const glState = useRef({
    gl: null,
    program: null,
    vs: null,
    fs: null,
    texture: null,
    buffer: null,
    uniforms: null,
    posLoc: -1,
    offscreenCanvas: null,
    offscreenCtx: null,
    samples: 18,
  });

  const perfState = useRef({
    fps: 60,
    lastTime: performance.now(),
    frameCount: 0,
    lastAdjustment: performance.now(),
  });

  const lastInteractionTime = useRef(0);
  const screenMouseRef = useRef({ x: 0.5, y: 0.5 });
  const rootImageRef = useRef(null);
  const wakeUpRef = useRef(null);

  useEffect(() => {
    focusModeRef.current = focusMode;
    lastInteractionTime.current = performance.now();
    if (wakeUpRef.current) wakeUpRef.current();
  }, [focusMode]);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      rootImageRef.current = img;
      if (wakeUpRef.current) wakeUpRef.current();
    };
    img.onerror = () => {
      if (!active || img.src.endsWith('/root-node.png')) return;
      img.src = '/root-node.png';
    };
    img.src = '/root-node.webp';
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = canvasRef.current;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    const isInitialMobile = window.innerWidth < 768;
    const computeTexScale = (w, h) => {
      // Supersample offscreen 2D canvas (min 2x on desktop, up to 3x on Retina) within WebGL texture limits
      const desired = w < 768 ? Math.max(1.75, dpr) : Math.max(2.0, Math.min(dpr * 1.5, 3.0));
      const maxDim = Math.max(w, h, 1);
      return Math.min(desired, 4096 / maxDim);
    };
    let width = window.innerWidth;
    let height = window.innerHeight;
    let texScale = computeTexScale(width, height);
    let texW = Math.max(1, Math.round(width * texScale));
    let texH = Math.max(1, Math.round(height * texScale));

    glState.current.samples = isInitialMobile ? 16 : 32;

    // --- 1. WebGL & Offscreen Canvas Initialization ---
    const initWebGL = () => {
      const gl = canvas.getContext('webgl', {
        antialias: false,
        alpha: true,
        stencil: false,
        depth: false,
        powerPreference: 'high-performance',
      });
      if (!gl) return null;

      if (!glState.current.offscreenCanvas) {
        glState.current.offscreenCanvas = document.createElement('canvas');
        glState.current.offscreenCtx = glState.current.offscreenCanvas.getContext('2d', { alpha: true });
      }

      const vsSource = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          vUv.y = 1.0 - vUv.y;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;
      const fsSource = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        #else
        precision mediump float;
        #endif
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform vec2 uCanvasRes;
        uniform float uRadius;
        uniform float uEnergy;
        uniform float uScrollBlur;
        uniform float uTime;
        uniform int uSamples;
        uniform vec2 uMouse;

        // Blue-noise-like Interleaved Gradient Noise for smooth, non-speckled bokeh on thin curves
        float ign(vec2 px) {
          return fract(52.9829189 * fract(dot(px, vec2(0.06711056, 0.00583715))));
        }

        // 4-tap Rotated Grid Supersampling (RGSS) downsample for crisp, stair-step-free diagonal links
        vec4 sampleRGSS(vec2 uv) {
          vec2 px = 1.0 / uCanvasRes;
          vec4 c = vec4(0.0);
          c += texture2D(uTexture, uv + vec2( 0.125,  0.375) * px);
          c += texture2D(uTexture, uv + vec2(-0.125, -0.375) * px);
          c += texture2D(uTexture, uv + vec2( 0.375, -0.125) * px);
          c += texture2D(uTexture, uv + vec2(-0.375,  0.125) * px);
          return c * 0.25;
        }

        void main() {
          vec2 center = uMouse;
          float dist = distance(vUv, center);
          float blurAmount = (smoothstep(0.14, 0.58, dist) * uRadius) + uScrollBlur;
          vec4 sharpColor = sampleRGSS(vUv);

          if (blurAmount < 0.35) {
            gl_FragColor = sharpColor;
            return;
          }

          vec4 color = vec4(0.0);
          float total = 0.0;
          float goldenAngle = 2.39996323;
          float jitter = ign(gl_FragCoord.xy) * 6.2831853;
          for (int i = 0; i < 36; i++) {
            if (i >= uSamples) break;
            float r = sqrt((float(i) + 0.5) / float(uSamples)) * blurAmount;
            float theta = float(i) * goldenAngle + jitter;
            vec2 offset = vec2(cos(theta), sin(theta)) * r / uResolution;
            if (mod(float(i), 4.0) < 1.0 && uEnergy > 0.02) {
              float aberration = 1.0 + (uEnergy * 0.05 * (blurAmount / (uRadius + 0.1)));
              color.r += texture2D(uTexture, vUv + offset * aberration).r;
              color.g += texture2D(uTexture, vUv + offset).g;
              color.b += texture2D(uTexture, vUv + offset / aberration).b;
              color.a += texture2D(uTexture, vUv + offset).a;
            } else {
              color += texture2D(uTexture, vUv + offset);
            }
            total += 1.0;
          }
          vec4 blurColor = color / total;
          float blend = smoothstep(0.35, 2.0, blurAmount);
          vec4 finalColor = mix(sharpColor, blurColor, blend);
          float grain = (ign(gl_FragCoord.xy + fract(uTime) * 17.0) - 0.5) * 0.012;
          finalColor.rgb += grain * finalColor.a * (blurAmount / max(uRadius, 1.0));
          finalColor.rgb *= (1.0 - smoothstep(0.42, 0.85, dist) * 0.1);
          gl_FragColor = finalColor;
        }
      `;
      const createShader = (glCtx, type, source) => {
        const shader = glCtx.createShader(type);
        glCtx.shaderSource(shader, source);
        glCtx.compileShader(shader);
        if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
          glCtx.deleteShader(shader);
          return null;
        }
        return shader;
      };
      const program = gl.createProgram();
      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        gl.deleteProgram(program);
        return null;
      }
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteProgram(program);
        return null;
      }

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      const uniforms = {
        uResolution: gl.getUniformLocation(program, 'uResolution'),
        uCanvasRes: gl.getUniformLocation(program, 'uCanvasRes'),
        uRadius: gl.getUniformLocation(program, 'uRadius'),
        uScrollBlur: gl.getUniformLocation(program, 'uScrollBlur'),
        uEnergy: gl.getUniformLocation(program, 'uEnergy'),
        uTime: gl.getUniformLocation(program, 'uTime'),
        uSamples: gl.getUniformLocation(program, 'uSamples'),
        uMouse: gl.getUniformLocation(program, 'uMouse'),
      };
      const posLoc = gl.getAttribLocation(program, 'position');

      return { gl, program, vs, fs, buffer, texture, uniforms, posLoc };
    };

    const webgl = initWebGL();
    const fallbackCtx2d = webgl ? null : canvas.getContext('2d', { alpha: true });
    if (webgl && webgl.gl) {
      glState.current = { ...glState.current, ...webgl };
    } else {
      glState.current.gl = null;
    }

    // --- 2. Utility Functions ---
    const measureLabelWidth = (label, depth = 1) => {
      const ctx = glState.current.offscreenCtx || fallbackCtx2d;
      if (!ctx) return label.length * 8 + 16;
      const fontSize = depth === 0
        ? (window.innerWidth < 768 ? 60 : 120)
        : (window.innerWidth < 768 ? 16 : 12);
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
      const w = Math.ceil(ctx.measureText(label).width);
      return w + (depth === 0 ? 40 : 10);
    };

    const nodes_sim_ref = { current: [] };
    let textureDirty = true;
    let lastScrollY = window.scrollY;
    let scrollDirty = true;

    // --- 3. Data Preparation ---
    const buildTree = () => {
      const isMobile = window.innerWidth < 768;
      const root = { name: isMobile ? 'Skills' : cvData.personal.name, children: [] };
      const categories = {};
      const uniqueCats = [...new Set(cvData.skills.map(s => s.category))];
      const mapSkill = (skill, baseHue) => ({
        name: skill.name,
        level: skill.level,
        baseHue,
        children: skill.children ? skill.children.map(c => mapSkill(c, baseHue)) : [],
      });
      cvData.skills.forEach(skill => {
        if (!categories[skill.category]) {
          const catIndex = uniqueCats.indexOf(skill.category);
          const baseHue = (catIndex / uniqueCats.length) * 360;
          categories[skill.category] = { name: skill.category, children: [], baseHue, level: 80 };
          root.children.push(categories[skill.category]);
        }
        categories[skill.category].children.push(mapSkill(skill, categories[skill.category].baseHue));
      });
      return root;
    };

    const layoutTree = (root, options) => {
      const nodeSizeY = options.nodeHeight || 40;
      const nodeSizeX = options.nodeWidth || 140;
      const nodes = [];
      const links = [];
      const depthToLeaves = new Map();
      function walk(node, depth, parent) {
        const current = {
          node,
          depth,
          x: 0,
          y: depth * nodeSizeY,
          parent: null,
          baseHue: node.baseHue || 0,
          level: node.level || 70,
        };
        if (parent) current.parent = parent;
        if (!node.children || node.children.length === 0) {
          const idx = depthToLeaves.get(depth) || 0;
          depthToLeaves.set(depth, idx + 1);
          current.x = idx * nodeSizeX;
        } else {
          const children = node.children.map(child => walk(child, depth + 1, current));
          current.x = (Math.min(...children.map(c => c.x)) + Math.max(...children.map(c => c.x))) / 2;
        }
        nodes.push(current);
        if (current.parent) links.push({ source: current.parent, target: current });
        return current;
      }
      const rootPlaced = walk(root, 0, null);
      const minX = Math.min(...nodes.map(n => n.x));
      nodes.forEach(n => {
        n.x = n.x - minX + options.paddingX;
      });
      return { nodes, links, root: rootPlaced };
    };

    const getCenter = () => {
      const isMobile = width < 768;
      return {
        cx: (width + (!isMobile && !focusModeRef.current ? 320 : 0)) / 2,
        cy: isMobile ? height * 0.52 : height / 2,
      };
    };

    const treeData = buildTree();
    const layout = layoutTree(treeData, { nodeWidth: 200, nodeHeight: 80, paddingX: 40 });
    const initialCenter = getCenter();

    // Deterministic seeded jitter so initial layout is clean and reproducible
    nodes_sim_ref.current = layout.nodes.map((n, idx) => {
      const label = n.node.name;
      const isMobile = width < 768;
      const w = n.depth === 0 ? (isMobile ? 120 : 200) : measureLabelWidth(label, n.depth);
      let initX;
      let initY;
      if (n.depth === 0) {
        initX = initialCenter.cx;
        initY = initialCenter.cy;
      } else {
        const angle = (n.baseHue / 360) * (Math.PI * 2) + ((idx % 7) - 3) * 0.14;
        const distance = n.depth === 1 ? 240 : n.depth * 145;
        initX = initialCenter.cx + Math.cos(angle) * distance;
        initY = initialCenter.cy + Math.sin(angle) * distance * 0.72;
      }
      return {
        name: label,
        depth: n.depth,
        level: n.level,
        parent: n.parent,
        baseHue: n.baseHue,
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        width: w,
        height: n.depth === 0 ? (isMobile ? 120 : 200) : 28,
        fx: null,
        fy: null,
        hoverInfluence: 1.0,
      };
    });

    const links_sim = layout.links.map(l => ({
      source: nodes_sim_ref.current[layout.nodes.indexOf(l.source)],
      target: nodes_sim_ref.current[layout.nodes.indexOf(l.target)],
      rest: (l.source.depth === 0 ? 260 : 110) + l.source.depth * 35,
    }));

    // --- 4. Physics & Animation ---
    const springK = 0.08;
    const damping = 0.05;
    const charge = 6000;
    const centerK = 0.015;
    const maxVelocity = 6.0;
    const edgeRepelK = 1000;
    const view = { x: 0, y: 0, scale: 1, vx: 0, vy: 0, vs: 0 };
    const viewSpringK = 0.06;
    const viewDamping = 0.82;
    const mousePos = { x: -10000, y: -10000 };
    const STABLE_ENERGY_THRESHOLD = 0.002;
    let dragging = null;
    let raf = null;
    let isPaused = false;

    const computeTargetView = () => {
      const nodes = nodes_sim_ref.current;
      const isMobile = width < 768;
      const { cx, cy } = getCenter();
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        minX = Math.min(minX, n.x - n.width / 2);
        maxX = Math.max(maxX, n.x + n.width / 2);
        minY = Math.min(minY, n.y - n.height / 2);
        maxY = Math.max(maxY, n.y + n.height / 2);
      }
      const availW = isMobile ? width - 32 : width - (!focusModeRef.current ? 320 : 0) - 180;
      const availH = isMobile ? height - 200 : height - 280;
      const minScale = isMobile ? 0.42 : 0.55;
      const targetScale = Math.max(
        minScale,
        Math.min(
          1.35,
          Math.min(
            Math.max(120, availW) / (maxX - minX || 100),
            Math.max(160, availH) / (maxY - minY || 100)
          )
        )
      );
      const targetX = cx - targetScale * ((minX + maxX) / 2);
      const targetY = cy - targetScale * ((minY + maxY) / 2);
      return { targetX, targetY, targetScale };
    };

    const stepPhysics = (snapView = false) => {
      const nodes = nodes_sim_ref.current;
      const isMobile = width < 768;
      const edgeMargin = isMobile ? 24 : 50;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.ax = 0;
        n.ay = 0;
        const dist = Math.hypot(n.x - mousePos.x, n.y - mousePos.y);
        n.hoverInfluence = 1.0 + 0.2 * Math.exp(-(dist * dist) / (2 * 150 * 150));
      }

      for (let i = 0; i < links_sim.length; i++) {
        const l = links_sim[i];
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = springK * (dist - l.rest);
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        l.source.ax += fx;
        l.source.ay += fy;
        l.target.ax -= fx;
        l.target.ay -= fy;
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = Math.max(36, dx * dx + dy * dy);
          const dist = Math.sqrt(dist2);
          const levelFactor = ((a.level || 70) / 85) * ((b.level || 70) / 85);
          let currCharge = charge * a.hoverInfluence * b.hoverInfluence * levelFactor;
          if (a.depth === 0 || b.depth === 0) currCharge *= 30;
          else if (a.depth === 1 && b.depth === 1) currCharge *= 25;
          else if (a.parent !== b.parent) {
            currCharge *= 15;
          } else if (a.depth >= 2 && b.depth >= 2 && a.parent === b.parent) {
            const force = 0.1 * (dist - (a.depth === 2 ? 100 : 60));
            const fx = force * (dx / dist);
            const fy = force * (dy / dist);
            a.ax += fx;
            a.ay += fy;
            b.ax -= fx;
            b.ay -= fy;
            continue;
          }
          const force = currCharge / dist2;
          const fx = force * (dx / dist);
          const fy = force * (dy / dist);
          a.ax -= fx;
          a.ay -= fy;
          b.ax += fx;
          b.ay += fy;
        }
        if (!snapView) {
          const sx = a.x * view.scale + view.x;
          const sy = a.y * view.scale + view.y;
          if (sx < edgeMargin) a.ax += (edgeRepelK * (1 - sx / edgeMargin)) / view.scale;
          else if (sx > width - edgeMargin) a.ax -= (edgeRepelK * (1 - (width - sx) / edgeMargin)) / view.scale;
          if (sy < edgeMargin) a.ay += (edgeRepelK * (1 - sy / edgeMargin)) / view.scale;
          else if (sy > height - edgeMargin) a.ay -= (edgeRepelK * (1 - (height - sy) / edgeMargin)) / view.scale;
        }
      }

      const { cx, cy } = getCenter();
      const yAspectPull = isMobile ? centerK * 1.6 : centerK * 4;
      let totalVel = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.ax += (cx - n.x) * centerK;
        n.ay += (cy - n.y) * yAspectPull;
        if (n.hoverInfluence > 1) {
          n.ax += (cx - n.x) * (n.hoverInfluence - 1) * 0.08;
          n.ay += (cy - n.y) * (n.hoverInfluence - 1) * 0.08;
        }
        if (n.fx !== null) {
          n.x = n.fx;
          n.vx = 0;
        }
        if (n.fy !== null) {
          n.y = n.fy;
          n.vy = 0;
        }
        n.vx = (n.vx + n.ax) * damping;
        n.vy = (n.vy + n.ay) * damping;
        if (Math.abs(n.vx) > maxVelocity) n.vx = Math.sign(n.vx) * maxVelocity;
        if (Math.abs(n.vy) > maxVelocity) n.vy = Math.sign(n.vy) * maxVelocity;
        if (n.fx === null) n.x += n.vx;
        if (n.fy === null) n.y += n.vy;
        totalVel += Math.hypot(n.vx, n.vy);
      }

      const { targetX, targetY, targetScale } = computeTargetView();
      if (snapView) {
        view.x = targetX;
        view.y = targetY;
        view.scale = targetScale;
        view.vx = 0;
        view.vy = 0;
        view.vs = 0;
      } else {
        view.vx = (view.vx + (targetX - view.x) * viewSpringK) * viewDamping;
        view.vy = (view.vy + (targetY - view.y) * viewSpringK) * viewDamping;
        view.vs = (view.vs + (targetScale - view.scale) * viewSpringK) * viewDamping;
        view.x += view.vx;
        view.y += view.vy;
        view.scale += view.vs;
      }

      return Math.min(1.0, totalVel / (nodes.length * 2.0));
    };

    // Pre-settle synchronously in ~2ms before first paint so the graph starts centered
    // on all devices (including software WebGL and reduced-motion environments)
    for (let tick = 0; tick < 80; tick++) {
      stepPhysics(true);
    }
    // Place initial focus spot on the center of the settled graph
    const settledCenter = getCenter();
    screenMouseRef.current = { x: settledCenter.cx / Math.max(1, width), y: settledCenter.cy / Math.max(1, height) };

    const getLSDColor = (index, time, velFactor, depth = 1, baseHue = 0) => {
      if (depth === 0) return '#ffffff';

      const hue = depth === 1 ? baseHue : (baseHue + Math.sin(time * 0.0005 + index) * 15 + 360) % 360;
      let s = 0.4;
      let l = 0.8;

      if (depth === 1) {
        s = 0.5;
        l = 0.85;
      } else if (depth === 2) {
        s = 0.3;
        l = 0.75;
      } else if (depth === 3) {
        s = 0.2;
        l = 0.65;
      }

      s = Math.min(1.0, s + velFactor * 0.2);
      l = Math.min(1.0, l + velFactor * 0.1);

      const h = hue / 360;
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const f = t => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
      };

      return `rgb(${Math.round(f(h + 1 / 3) * 255)}, ${Math.round(f(h) * 255)}, ${Math.round(f(h - 1 / 3) * 255)})`;
    };

    function scheduleFrame() {
      if (raf === null && !isPaused) {
        raf = requestAnimationFrame(animate);
      }
    }

    wakeUpRef.current = () => {
      textureDirty = true;
      scheduleFrame();
    };

    const resize = (force = false) => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      if (!force && newW === width && Math.abs(newH - height) < 120 && newW < 768) {
        return;
      }
      width = newW;
      height = newH;
      texScale = computeTexScale(width, height);
      texW = Math.max(1, Math.round(width * texScale));
      texH = Math.max(1, Math.round(height * texScale));

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (nodes_sim_ref.current && nodes_sim_ref.current.length > 0) {
        const isMobile = width < 768;
        const newName = isMobile ? 'Skills' : cvData.personal.name;
        const rootNode = nodes_sim_ref.current.find(n => n.depth === 0);
        if (rootNode && rootNode.name !== newName) {
          rootNode.name = newName;
          rootNode.width = isMobile ? 120 : 200;
          rootNode.height = isMobile ? 120 : 200;
        }
        const { targetX, targetY, targetScale } = computeTargetView();
        view.x = targetX;
        view.y = targetY;
        view.scale = targetScale;
      }

      if (glState.current.gl && glState.current.offscreenCanvas) {
        glState.current.offscreenCanvas.width = texW;
        glState.current.offscreenCanvas.height = texH;
        const { gl, texture } = glState.current;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texW, texH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      const c = getCenter();
      screenMouseRef.current = { x: c.cx / Math.max(1, width), y: c.cy / Math.max(1, height) };
      textureDirty = true;
      scheduleFrame();
    };

    const findNodeAtClientPoint = (clientX, clientY, isTouch = false) => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      screenMouseRef.current = { x: sx / width, y: sy / height };
      const p = { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
      mousePos.x = p.x;
      mousePos.y = p.y;

      const touchPad = isTouch ? 22 : 8;
      let bestNode = null;
      let bestDist = Infinity;

      for (let i = nodes_sim_ref.current.length - 1; i >= 0; i--) {
        const n = nodes_sim_ref.current[i];
        const inf = n.hoverInfluence || 1;
        const nodeScreenX = n.x * view.scale + view.x;
        const nodeScreenY = (n.y - (n.depth === 0 ? 0 : 8 / view.scale)) * view.scale + view.y;
        const halfW = Math.max(22, (n.width * inf * view.scale) / 2) + touchPad;
        const halfH = Math.max(20, (n.height * inf * view.scale) / 2) + touchPad;

        const dx = Math.abs(sx - nodeScreenX);
        const dy = Math.abs(sy - nodeScreenY);
        if (dx <= halfW && dy <= halfH) {
          const d = Math.hypot(dx, dy);
          if (d < bestDist) {
            bestDist = d;
            bestNode = n;
          }
        }
      }
      return { node: bestNode, worldPoint: p };
    };

    const onPointerDown = e => {
      if (prefersReducedMotion || window.scrollY > height * 0.85) return;
      if (e.target.closest('a, button, input, textarea, header')) return;
      lastInteractionTime.current = performance.now();
      const isTouch = e.pointerType === 'touch';
      const { node, worldPoint } = findNodeAtClientPoint(e.clientX, e.clientY, isTouch);
      if (node) {
        dragging = node;
        node.fx = worldPoint.x;
        node.fy = worldPoint.y;
      }
      scheduleFrame();
    };

    const onPointerMove = e => {
      if (prefersReducedMotion) return;
      if (window.scrollY > height * 1.1 && !dragging) return;
      lastInteractionTime.current = performance.now();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      screenMouseRef.current = { x: sx / width, y: sy / height };
      const p = { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
      mousePos.x = p.x;
      mousePos.y = p.y;
      if (dragging) {
        dragging.fx = p.x;
        dragging.fy = p.y;
        if (e.cancelable) e.preventDefault();
      }
      scheduleFrame();
    };

    const onPointerUp = () => {
      if (dragging) {
        dragging.fx = null;
        dragging.fy = null;
        dragging = null;
        lastInteractionTime.current = performance.now();
        scheduleFrame();
      }
    };

    const onTouchStart = e => {
      if (prefersReducedMotion || window.scrollY > height * 0.85) return;
      if (e.target.closest('a, button, input, textarea, header')) return;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      lastInteractionTime.current = performance.now();
      const { node, worldPoint } = findNodeAtClientPoint(t.clientX, t.clientY, true);
      if (node) {
        dragging = node;
        node.fx = worldPoint.x;
        node.fy = worldPoint.y;
        if (e.cancelable) e.preventDefault();
      }
      scheduleFrame();
    };

    const onTouchMove = e => {
      if (!dragging || e.touches.length !== 1) return;
      if (e.cancelable) e.preventDefault();
      const t = e.touches[0];
      lastInteractionTime.current = performance.now();
      const rect = canvas.getBoundingClientRect();
      const sx = t.clientX - rect.left;
      const sy = t.clientY - rect.top;
      screenMouseRef.current = { x: sx / width, y: sy / height };
      const p = { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
      mousePos.x = p.x;
      mousePos.y = p.y;
      dragging.fx = p.x;
      dragging.fy = p.y;
      scheduleFrame();
    };

    const onScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) > 0.5) {
        lastScrollY = window.scrollY;
        scrollDirty = true;
        scheduleFrame();
      }
    };

    const onVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        textureDirty = true;
        scheduleFrame();
      } else if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    const isSoftwareRenderer = (() => {
      try {
        const gl = glState.current.gl;
        if (!gl) return true;
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
        return /SwiftShader|llvmpipe|Software/i.test(renderer);
      } catch {
        return false;
      }
    })();

    const activeDurationMs = prefersReducedMotion || isSoftwareRenderer ? 0 : 2200;

    function animate() {
      raf = null;
      if (isPaused) return;

      const now = performance.now();
      perfState.current.frameCount++;
      if (now - perfState.current.lastTime >= 1000) {
        perfState.current.fps = (perfState.current.frameCount * 1000) / (now - perfState.current.lastTime);
        perfState.current.frameCount = 0;
        perfState.current.lastTime = now;
        const maxSamples = width < 768 ? 16 : 28;
        if (now - perfState.current.lastAdjustment > 2000) {
          if (perfState.current.fps < 45 && glState.current.samples > 8) glState.current.samples -= 4;
          else if (perfState.current.fps > 58 && glState.current.samples < maxSamples) glState.current.samples += 4;
          perfState.current.lastAdjustment = now;
        }
      }

      const isMobile = width < 768;
      const isActivePhysics =
        !prefersReducedMotion &&
        ((lastInteractionTime.current > 0 && now - lastInteractionTime.current <= activeDurationMs) || Boolean(dragging));
      let energy = 0;

      if (isActivePhysics) {
        energy = stepPhysics(false);
        textureDirty = true;
      }

      if (textureDirty) {
        const nodes = nodes_sim_ref.current;
        const { cx, cy } = getCenter();
        const useWebGL = Boolean(glState.current.gl);
        const ctx2d = useWebGL ? glState.current.offscreenCtx : fallbackCtx2d;

        if (ctx2d) {
          const drawScale = useWebGL ? texScale : dpr;
          ctx2d.setTransform(drawScale, 0, 0, drawScale, 0, 0);
          ctx2d.imageSmoothingEnabled = true;
          ctx2d.imageSmoothingQuality = 'high';
          ctx2d.clearRect(0, 0, width, height);
          ctx2d.save();
          ctx2d.translate(view.x, view.y);
          ctx2d.scale(view.scale, view.scale);

          links_sim.forEach((l, idx) => {
            const color = getLSDColor(
              idx,
              now,
              Math.min(1, (Math.hypot(l.source.vx, l.source.vy) + Math.hypot(l.target.vx, l.target.vy)) / 2 / (maxVelocity * 0.4)),
              l.target.depth,
              l.target.baseHue
            );
            const setAlpha = (c, a) =>
              c.startsWith('rgba') ? c.replace(/,[\s\d.]+\)$/, `, ${a})`) : c.replace('rgb', 'rgba').replace(')', `, ${a})`);
            const midX = (l.source.x + l.target.x) / 2;
            const midY = (l.source.y + l.target.y) / 2;
            const cpX = midX + (cx - midX) * 0.15;
            const cpY = midY + (cy - midY) * 0.15;
            const w = (l.source.depth === 0 ? 3.0 : l.source.depth === 1 ? 1.7 : 1.25) / view.scale;
            ctx2d.lineCap = 'round';
            ctx2d.lineJoin = 'round';
            ctx2d.beginPath();
            ctx2d.moveTo(l.source.x, l.source.y);
            ctx2d.quadraticCurveTo(cpX, cpY, l.target.x, l.target.y);
            // Smooth 3-layer Gaussian-like cross-section eliminates sub-pixel aliasing on thin curves
            ctx2d.strokeStyle = setAlpha(color, 0.08);
            ctx2d.lineWidth = w * 4.5;
            ctx2d.stroke();
            ctx2d.strokeStyle = setAlpha(color, 0.22);
            ctx2d.lineWidth = w * 2.1;
            ctx2d.stroke();
            ctx2d.strokeStyle = setAlpha(color, 0.56);
            ctx2d.lineWidth = w;
            ctx2d.stroke();
          });

          nodes.forEach((n, idx) => {
            const color = getLSDColor(idx, now, Math.min(1, Math.hypot(n.vx, n.vy) / (maxVelocity * 0.4)), n.depth, n.baseHue);

            if (n.depth !== 0) {
              ctx2d.fillStyle = color;
              ctx2d.beginPath();
              const baseSize = n.depth === 1 ? 2.5 : n.depth === 2 ? 1.8 : 1.2;
              const dotSize = ((n.level || 70) / 85) * baseSize;
              ctx2d.arc(n.x, n.y, (dotSize * n.hoverInfluence) / view.scale, 0, Math.PI * 2);
              ctx2d.fill();
            }

            ctx2d.strokeStyle = 'rgba(5, 5, 5, 0.9)';
            ctx2d.lineJoin = 'round';

            if (n.depth === 0) {
              if (rootImageRef.current) {
                const size = (isMobile ? 120 : 200) * n.hoverInfluence;
                const aspect = rootImageRef.current.width / rootImageRef.current.height;
                const h = size;
                const w = size * aspect;
                ctx2d.drawImage(rootImageRef.current, n.x - w / 2, n.y - h / 2, w, h);
              } else {
                const fontSize = (isMobile ? 50 : 100) * n.hoverInfluence;
                ctx2d.font = `900 ${fontSize}px "Inter", sans-serif`;
                ctx2d.textAlign = 'center';
                ctx2d.textBaseline = 'middle';
                ctx2d.letterSpacing = '-2px';
                ctx2d.lineWidth = 6 * n.hoverInfluence;
                ctx2d.strokeText(n.name.toUpperCase(), n.x, n.y);
                ctx2d.fillStyle = '#ffffff';
                ctx2d.fillText(n.name.toUpperCase(), n.x, n.y);
                ctx2d.letterSpacing = '0px';
              }
            } else {
              const fontSize = (isMobile ? 13 : 11) * n.hoverInfluence;
              ctx2d.font = `600 ${fontSize}px "Inter", sans-serif`;
              ctx2d.textAlign = 'center';
              ctx2d.textBaseline = 'bottom';
              ctx2d.lineWidth = 3 * n.hoverInfluence;
              ctx2d.strokeText(n.name, n.x, n.y - 12 / view.scale);
              ctx2d.fillStyle = color;
              ctx2d.fillText(n.name, n.x, n.y - 12 / view.scale);
            }
          });
          ctx2d.restore();

          if (useWebGL) {
            const { gl, texture, offscreenCanvas } = glState.current;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
          }
        }
        textureDirty = false;
      }

      if (glState.current.gl) {
        const { gl, program, texture, buffer, uniforms, posLoc, offscreenCanvas } = glState.current;
        gl.useProgram(program);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform2f(uniforms.uResolution, offscreenCanvas.width, offscreenCanvas.height);
        gl.uniform2f(uniforms.uCanvasRes, canvas.width, canvas.height);
        gl.uniform1f(uniforms.uRadius, (prefersReducedMotion ? 0 : 10 + energy * 20) * texScale);
        gl.uniform1f(uniforms.uScrollBlur, Math.min(window.scrollY / 800, 1) * 40 * texScale);
        gl.uniform1f(uniforms.uEnergy, energy);
        gl.uniform1f(uniforms.uTime, now / 1000);
        const renderSamples = isActivePhysics ? Math.min(glState.current.samples, isMobile ? 16 : 24) : (isMobile ? 20 : 36);
        gl.uniform1i(uniforms.uSamples, renderSamples);
        gl.uniform2f(uniforms.uMouse, screenMouseRef.current.x, screenMouseRef.current.y);
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      scrollDirty = false;

      if (isActivePhysics && (energy >= STABLE_ENERGY_THRESHOLD || now - lastInteractionTime.current <= activeDurationMs || dragging)) {
        scheduleFrame();
      } else if (scrollDirty) {
        scheduleFrame();
      }
    }

    const onResize = () => resize(false);
    resize(true);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: true });
    window.addEventListener('touchcancel', onPointerUp, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (raf !== null) cancelAnimationFrame(raf);
      if (glState.current.gl) {
        const { gl, texture, buffer, program, vs, fs } = glState.current;
        if (texture) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        glState.current.gl = null;
        glState.current.program = null;
        glState.current.texture = null;
        glState.current.buffer = null;
        glState.current.vs = null;
        glState.current.fs = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className="fixed inset-0 w-full h-full z-0 bg-[#050505] overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
    </div>
  );
};

export default SkillsGraph2D;
