import { cvData } from './data/cvData.js';

/**
 * GPU-Native Skills Graph:
 * - Curved quadratic Bezier links are tessellated into tiny vertex buffers (~50 KB)
 *   and shaded with analytic per-pixel SDF antialiasing + Gaussian glow on the GPU
 *   (zero CPU curve rasterization, zero stair-stepping at any DPI).
 * - Node dots are rendered on GPU as analytic SDF circles.
 * - Text labels & root portrait are rendered to a lightweight 2D canvas and composited
 *   into FBO A alongside GPU links/nodes, followed by a separable 2-pass radial
 *   depth-of-field blur (O(2R) instead of O(R^2), zero Poisson speckle).
 * - Sleeps at 0% CPU/GPU when settled.
 */
export function mountSkillsGraph(canvas, { initialFocusMode = false } = {}) {
  let focusMode = initialFocusMode;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
  let width = window.innerWidth;
  let height = window.innerHeight;
  let rootImage = null;
  let raf = null;
  let isPaused = false;
  let labelsDirty = true;
  let lastInteractionTime = 0;
  let lastScrollY = window.scrollY;
  let lastScrollBlur = -1;
  let scrollDirty = true;
  let dragging = null;

  const screenMouse = { x: 0.5, y: 0.5 };
  const mousePos = { x: -10000, y: -10000 };

  // --- 1. Build & layout skill tree ---
  const buildTree = () => {
    const isMobile = width < 768;
    const root = { name: isMobile ? 'Skills' : cvData.personal.name, children: [] };
    const categories = {};
    const uniqueCats = [...new Set(cvData.skills.map((s) => s.category))];
    const mapSkill = (skill, baseHue) => ({
      name: skill.name,
      level: skill.level,
      baseHue,
      children: skill.children ? skill.children.map((c) => mapSkill(c, baseHue)) : [],
    });
    cvData.skills.forEach((skill) => {
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
        const children = node.children.map((child) => walk(child, depth + 1, current));
        current.x = (Math.min(...children.map((c) => c.x)) + Math.max(...children.map((c) => c.x))) / 2;
      }
      nodes.push(current);
      if (current.parent) links.push({ source: current.parent, target: current });
      return current;
    }
    const rootPlaced = walk(root, 0, null);
    const minX = Math.min(...nodes.map((n) => n.x));
    nodes.forEach((n) => {
      n.x = n.x - minX + options.paddingX;
    });
    return { nodes, links, root: rootPlaced };
  };

  const getCenter = () => {
    const isMobile = width < 768;
    return {
      cx: (width + (!isMobile && !focusMode ? 320 : 0)) / 2,
      cy: isMobile ? height * 0.48 : height / 2,
    };
  };

  const getLSDRgb = (index, time, velFactor, depth = 1, baseHue = 0) => {
    if (depth === 0) return [1, 1, 1];
    const hue = depth === 1 ? baseHue : (baseHue + Math.sin(time * 0.0005 + index) * 15 + 360) % 360;
    let s = depth === 1 ? 0.5 : depth === 2 ? 0.32 : 0.22;
    let l = depth === 1 ? 0.85 : depth === 2 ? 0.76 : 0.66;
    s = Math.min(1.0, s + velFactor * 0.2);
    l = Math.min(1.0, l + velFactor * 0.1);
    const h = hue / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  };

  // --- 2. WebGL Pipeline Setup ---
  const labelCanvas = document.createElement('canvas');
  const labelCtx = labelCanvas.getContext('2d', { alpha: true });

  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const createProgram = (gl, vsSrc, fsSrc) => {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return null;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  };

  const PREC = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
  `;

  const initWebGL = () => {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      stencil: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return null;

    // Program A: GPU Analytic SDF Bezier Link Ribbons
    const linkProg = createProgram(
      gl,
      `
      attribute vec2 aPos;
      attribute float aSide;
      attribute float aHalfWidth;
      attribute vec3 aColor;
      uniform vec2 uViewport;
      varying float vSide;
      varying float vHalfWidth;
      varying vec3 vColor;
      void main() {
        vec2 clip = (aPos / uViewport) * 2.0 - 1.0;
        clip.y = -clip.y;
        gl_Position = vec4(clip, 0.0, 1.0);
        vSide = aSide;
        vHalfWidth = aHalfWidth;
        vColor = aColor;
      }
      `,
      `
      ${PREC}
      varying float vSide;
      varying float vHalfWidth;
      varying vec3 vColor;
      void main() {
        float distPx = abs(vSide) * vHalfWidth;
        float coreRadius = vHalfWidth * 0.24;
        // Resolution-independent analytic SDF antialiasing + smooth Gaussian halo
        float core = 1.0 - smoothstep(max(0.0, coreRadius - 0.85), coreRadius + 0.85, distPx);
        float normGlow = distPx / max(vHalfWidth, 1.0);
        float glow = exp(-normGlow * normGlow * 4.5) * 0.28;
        float alpha = clamp(core * 0.62 + glow, 0.0, 1.0);
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(vColor * alpha, alpha);
      }
      `
    );

    // Program B: GPU Analytic SDF Node Dots
    const dotProg = createProgram(
      gl,
      `
      attribute vec2 aPos;
      attribute float aSize;
      attribute vec3 aColor;
      uniform vec2 uViewport;
      varying vec3 vColor;
      varying float vSize;
      void main() {
        vec2 clip = (aPos / uViewport) * 2.0 - 1.0;
        clip.y = -clip.y;
        gl_Position = vec4(clip, 0.0, 1.0);
        gl_PointSize = aSize;
        vColor = aColor;
        vSize = aSize;
      }
      `,
      `
      ${PREC}
      varying vec3 vColor;
      varying float vSize;
      void main() {
        vec2 c = gl_PointCoord * 2.0 - 1.0;
        float r = length(c);
        float edge = 2.0 / max(vSize, 2.0);
        float core = 1.0 - smoothstep(0.45 - edge, 0.45 + edge, r);
        float halo = exp(-r * r * 5.0) * 0.35;
        float alpha = clamp(core + halo, 0.0, 1.0);
        if (alpha < 0.004) discard;
        gl_FragColor = vec4(vColor * alpha, alpha);
      }
      `
    );

    // Program C: Textured Fullscreen Quad (for compositing 2D label layer into FBO A)
    const blitProg = createProgram(
      gl,
      `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
      `,
      `
      ${PREC}
      varying vec2 vUv;
      uniform sampler2D uTex;
      void main() {
        gl_FragColor = texture2D(uTex, vUv);
      }
      `
    );

    // Program D: Separable 2-Pass Radial Depth-of-Field Blur (O(2R), zero Poisson noise)
    const blurProg = createProgram(
      gl,
      `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
      `,
      `
      ${PREC}
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2 uDir;
      uniform float uRadius;
      uniform float uScrollBlur;
      uniform float uEnergy;
      uniform vec2 uMouse;
      uniform float uVignette;

      void main() {
        // Flip Y for distance calculation so uMouse matches top-down screen UV
        vec2 screenUv = vec2(vUv.x, 1.0 - vUv.y);
        float dist = distance(screenUv, uMouse);
        float blurPx = (smoothstep(0.14, 0.58, dist) * uRadius) + uScrollBlur;

        if (blurPx < 0.35) {
          gl_FragColor = texture2D(uTex, vUv);
          return;
        }

        // 9-tap separable Gaussian (effective 81-tap 2D Gaussian across H+V passes)
        float w0 = 0.20416369;
        float w1 = 0.18017382;
        float w2 = 0.12383154;
        float w3 = 0.06628225;
        float w4 = 0.02763055;

        vec2 step1 = uDir * (blurPx * 0.25);
        vec2 step2 = uDir * (blurPx * 0.50);
        vec2 step3 = uDir * (blurPx * 0.75);
        vec2 step4 = uDir * (blurPx * 1.00);

        vec4 acc = texture2D(uTex, vUv) * w0;
        acc += (texture2D(uTex, vUv + step1) + texture2D(uTex, vUv - step1)) * w1;
        acc += (texture2D(uTex, vUv + step2) + texture2D(uTex, vUv - step2)) * w2;
        acc += (texture2D(uTex, vUv + step3) + texture2D(uTex, vUv - step3)) * w3;
        acc += (texture2D(uTex, vUv + step4) + texture2D(uTex, vUv - step4)) * w4;

        // Subtle chromatic dispersion along horizontal pass when energy > 0
        if (uEnergy > 0.03 && uVignette > 0.5) {
          vec2 ca = uDir * (blurPx * uEnergy * 0.18);
          acc.r = mix(acc.r, texture2D(uTex, vUv + ca).r, 0.45);
          acc.b = mix(acc.b, texture2D(uTex, vUv - ca).b, 0.45);
        }

        if (uVignette > 0.5) {
          acc.rgb *= (1.0 - smoothstep(0.42, 0.85, dist) * 0.1);
        }

        gl_FragColor = acc;
      }
      `
    );

    if (!linkProg || !dotProg || !blitProg || !blurProg) return null;

    const makeTex = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    };

    const makeFBO = () => {
      const fbo = gl.createFramebuffer();
      const tex = makeTex();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { fbo, tex };
    };

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const linkBuf = gl.createBuffer();
    const dotBuf = gl.createBuffer();
    const labelTex = makeTex();
    const fboScene = makeFBO();
    const fboTemp = makeFBO();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    return {
      gl,
      linkProg,
      dotProg,
      blitProg,
      blurProg,
      quadBuf,
      linkBuf,
      dotBuf,
      labelTex,
      fboScene,
      fboTemp,
      loc: {
        linkPos: gl.getAttribLocation(linkProg, 'aPos'),
        linkSide: gl.getAttribLocation(linkProg, 'aSide'),
        linkHW: gl.getAttribLocation(linkProg, 'aHalfWidth'),
        linkCol: gl.getAttribLocation(linkProg, 'aColor'),
        linkVP: gl.getUniformLocation(linkProg, 'uViewport'),
        dotPos: gl.getAttribLocation(dotProg, 'aPos'),
        dotSize: gl.getAttribLocation(dotProg, 'aSize'),
        dotCol: gl.getAttribLocation(dotProg, 'aColor'),
        dotVP: gl.getUniformLocation(dotProg, 'uViewport'),
        blitPos: gl.getAttribLocation(blitProg, 'aPos'),
        blitTex: gl.getUniformLocation(blitProg, 'uTex'),
        blurPos: gl.getAttribLocation(blurProg, 'aPos'),
        blurTex: gl.getUniformLocation(blurProg, 'uTex'),
        blurDir: gl.getUniformLocation(blurProg, 'uDir'),
        blurRadius: gl.getUniformLocation(blurProg, 'uRadius'),
        blurScroll: gl.getUniformLocation(blurProg, 'uScrollBlur'),
        blurEnergy: gl.getUniformLocation(blurProg, 'uEnergy'),
        blurMouse: gl.getUniformLocation(blurProg, 'uMouse'),
        blurVignette: gl.getUniformLocation(blurProg, 'uVignette'),
      },
    };
  };

  const gpu = initWebGL();
  const fallbackCtx = gpu ? null : canvas.getContext('2d', { alpha: true });

  const measureLabelWidth = (label, depth = 1) => {
    const ctx = labelCtx || fallbackCtx;
    if (!ctx) return label.length * 8 + 16;
    const fontSize = depth === 0 ? (width < 768 ? 60 : 120) : (width < 768 ? 16 : 12);
    ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    return Math.ceil(ctx.measureText(label).width) + (depth === 0 ? 40 : 10);
  };

  const treeData = buildTree();
  const layout = layoutTree(treeData, { nodeWidth: 200, nodeHeight: 80, paddingX: 40 });
  const initialCenter = getCenter();

  const nodes = layout.nodes.map((n, idx) => {
    const label = n.node.name;
    const isMobile = width < 768;
    const w = n.depth === 0 ? (isMobile ? 120 : 200) : measureLabelWidth(label, n.depth);
    let initX = initialCenter.cx;
    let initY = initialCenter.cy;
    if (n.depth !== 0) {
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

  const links = layout.links.map((l) => ({
    source: nodes[layout.nodes.indexOf(l.source)],
    target: nodes[layout.nodes.indexOf(l.target)],
    rest: (l.source.depth === 0 ? 260 : 110) + l.source.depth * 35,
  }));

  // Pre-allocate typed arrays for zero-GC GPU uploads
  const SEGMENTS = 24;
  // 2 triangles (6 vertices) per segment, 7 floats per vertex: x, y, side, halfWidth, r, g, b
  const linkVerts = new Float32Array(links.length * SEGMENTS * 6 * 7);
  // 6 floats per dot: x, y, size, r, g, b
  const dotVerts = new Float32Array(nodes.length * 6);

  // --- 3. Physics ---
  const springK = 0.08;
  const damping = 0.05;
  const charge = 6000;
  const centerK = 0.015;
  const maxVelocity = 6.0;
  const edgeRepelK = 1000;
  const view = { x: 0, y: 0, scale: 1, vx: 0, vy: 0, vs: 0 };
  const viewSpringK = 0.06;
  const viewDamping = 0.82;
  const STABLE_ENERGY_THRESHOLD = 0.002;

  const computeTargetView = () => {
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
    const availW = isMobile ? width - 32 : width - (!focusMode ? 320 : 0) - 180;
    const availH = isMobile ? height - 220 : height - 300;
    const minScale = isMobile ? 0.42 : 0.55;
    const targetScale = Math.max(
      minScale,
      Math.min(1.35, Math.min(Math.max(120, availW) / (maxX - minX || 100), Math.max(160, availH) / (maxY - minY || 100)))
    );
    return {
      targetX: cx - targetScale * ((minX + maxX) / 2),
      targetY: cy - targetScale * ((minY + maxY) / 2),
      targetScale,
    };
  };

  const stepPhysics = (snapView = false) => {
    const isMobile = width < 768;
    const edgeMargin = isMobile ? 24 : 50;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.ax = 0;
      n.ay = 0;
      const dist = Math.hypot(n.x - mousePos.x, n.y - mousePos.y);
      n.hoverInfluence = 1.0 + 0.2 * Math.exp(-(dist * dist) / (2 * 150 * 150));
    }

    for (let i = 0; i < links.length; i++) {
      const l = links[i];
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

  for (let t = 0; t < 80; t++) stepPhysics(true);
  const settledC = getCenter();
  screenMouse.x = settledC.cx / Math.max(1, width);
  screenMouse.y = settledC.cy / Math.max(1, height);

  // --- 4. GPU Geometry Builders & Render ---
  let labelScale = Math.min(dpr, 1.5);

  const resize = (force = false) => {
    const newW = window.innerWidth;
    const newH = window.innerHeight;
    if (!force && newW === width && Math.abs(newH - height) < 120 && newW < 768) return;
    width = newW;
    height = newH;
    labelScale = width < 768 ? Math.min(dpr, 1.25) : Math.min(dpr, 1.5);

    const cw = Math.max(1, Math.round(width * dpr));
    const ch = Math.max(1, Math.round(height * dpr));
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const isMobile = width < 768;
    const rootNode = nodes.find((n) => n.depth === 0);
    if (rootNode) {
      rootNode.name = isMobile ? 'Skills' : cvData.personal.name;
      rootNode.width = isMobile ? 120 : 200;
      rootNode.height = isMobile ? 120 : 200;
    }
    const { targetX, targetY, targetScale } = computeTargetView();
    view.x = targetX;
    view.y = targetY;
    view.scale = targetScale;

    if (gpu) {
      const { gl, fboScene, fboTemp, labelTex } = gpu;
      const lw = Math.max(1, Math.round(width * labelScale));
      const lh = Math.max(1, Math.round(height * labelScale));
      labelCanvas.width = lw;
      labelCanvas.height = lh;

      gl.bindTexture(gl.TEXTURE_2D, labelTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, lw, lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      for (const target of [fboScene, fboTemp]) {
        gl.bindTexture(gl.TEXTURE_2D, target.tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cw, ch, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
    }

    const c = getCenter();
    screenMouse.x = c.cx / Math.max(1, width);
    screenMouse.y = c.cy / Math.max(1, height);
    labelsDirty = true;
    scheduleFrame();
  };

  const renderLabelsTo2D = (ctx, scale, now, drawLinksFallback = false) => {
    const isMobile = width < 768;
    const { cx, cy } = getCenter();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    if (drawLinksFallback) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const [r, g, b] = getLSDRgb(i, now, 0, l.target.depth, l.target.baseHue);
        const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
        const midX = (l.source.x + l.target.x) * 0.5;
        const midY = (l.source.y + l.target.y) * 0.5;
        const cpX = midX + (cx - midX) * 0.15;
        const cpY = midY + (cy - midY) * 0.15;
        const w = (l.source.depth === 0 ? 3.0 : l.source.depth === 1 ? 1.7 : 1.25) / view.scale;
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.quadraticCurveTo(cpX, cpY, l.target.x, l.target.y);
        ctx.strokeStyle = `rgba(${rgb}, 0.18)`;
        ctx.lineWidth = w * 3.2;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${rgb}, 0.58)`;
        ctx.lineWidth = w;
        ctx.stroke();
      }
    }

    ctx.strokeStyle = 'rgba(5, 5, 5, 0.9)';
    ctx.lineJoin = 'round';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const [r, g, b] = getLSDRgb(i, now, Math.min(1, Math.hypot(n.vx, n.vy) / (maxVelocity * 0.4)), n.depth, n.baseHue);
      const color = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;

      if (drawLinksFallback && n.depth !== 0) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const baseSize = n.depth === 1 ? 2.5 : n.depth === 2 ? 1.8 : 1.2;
        ctx.arc(n.x, n.y, (((n.level || 70) / 85) * baseSize * n.hoverInfluence) / view.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      if (n.depth === 0) {
        if (rootImage) {
          const size = (isMobile ? 120 : 200) * n.hoverInfluence;
          const aspect = rootImage.width / rootImage.height;
          ctx.drawImage(rootImage, n.x - (size * aspect) / 2, n.y - size / 2, size * aspect, size);
        } else {
          const fontSize = (isMobile ? 50 : 100) * n.hoverInfluence;
          ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 6 * n.hoverInfluence;
          ctx.strokeText(n.name.toUpperCase(), n.x, n.y);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(n.name.toUpperCase(), n.x, n.y);
        }
      } else {
        const fontSize = (isMobile ? 13 : 11) * n.hoverInfluence;
        ctx.font = `600 ${fontSize}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3 * n.hoverInfluence;
        ctx.strokeText(n.name, n.x, n.y - 12 / view.scale);
        ctx.fillStyle = color;
        ctx.fillText(n.name, n.x, n.y - 12 / view.scale);
      }
    }
    ctx.restore();
  };

  const buildGpuGeometry = (now) => {
    const { cx, cy } = getCenter();
    let ptr = 0;

    for (let i = 0; i < links.length; i++) {
      const l = links[i];
      const vel = (Math.hypot(l.source.vx, l.source.vy) + Math.hypot(l.target.vx, l.target.vy)) * 0.5 / (maxVelocity * 0.4);
      const [r, g, b] = getLSDRgb(i, now, Math.min(1, vel), l.target.depth, l.target.baseHue);

      const x0 = l.source.x * view.scale + view.x;
      const y0 = l.source.y * view.scale + view.y;
      const x2 = l.target.x * view.scale + view.x;
      const y2 = l.target.y * view.scale + view.y;
      const midX = (l.source.x + l.target.x) * 0.5;
      const midY = (l.source.y + l.target.y) * 0.5;
      const x1 = (midX + (cx - midX) * 0.15) * view.scale + view.x;
      const y1 = (midY + (cy - midY) * 0.15) * view.scale + view.y;

      // Half-width in physical pixels (includes soft Gaussian halo)
      const baseCssW = l.source.depth === 0 ? 5.6 : l.source.depth === 1 ? 3.4 : 2.5;
      const hwPx = baseCssW * dpr;
      const hwCss = baseCssW;

      let prevX = x0;
      let prevY = y0;
      let prevNx = 0;
      let prevNy = 0;

      for (let s = 0; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS;
        const it = 1 - t;
        const px = it * it * x0 + 2 * it * t * x1 + t * t * x2;
        const py = it * it * y0 + 2 * it * t * y1 + t * t * y2;
        // Analytical derivative of quadratic Bezier for exact normal
        const tx = 2 * it * (x1 - x0) + 2 * t * (x2 - x1);
        const ty = 2 * it * (y1 - y0) + 2 * t * (y2 - y1);
        const len = Math.hypot(tx, ty) || 1;
        const nx = (-ty / len) * hwCss;
        const ny = (tx / len) * hwCss;

        if (s > 0) {
          // Quad as 2 triangles
          const p0x = prevX + prevNx; const p0y = prevY + prevNy;
          const p1x = prevX - prevNx; const p1y = prevY - prevNy;
          const p2x = px + nx;        const p2y = py + ny;
          const p3x = px - nx;        const p3y = py - ny;

          linkVerts[ptr++] = p0x; linkVerts[ptr++] = p0y; linkVerts[ptr++] = 1;  linkVerts[ptr++] = hwPx; linkVerts[ptr++] = r; linkVerts[ptr++] = g; linkVerts[ptr++] = b;
          linkVerts[ptr++] = p1x; linkVerts[ptr++] = p1y; linkVerts[ptr++] = -1; linkVerts[ptr++] = hwPx; linkVerts[ptr++] = r; linkVerts[ptr++] = g; linkVerts[ptr++] = b;
          linkVerts[ptr++] = p2x; linkVerts[ptr++] = p2y; linkVerts[ptr++] = 1;  linkVerts[ptr++] = hwPx; linkVerts[ptr++] = r; linkVerts[ptr++] = g; linkVerts[ptr++] = b;

          linkVerts[ptr++] = p2x; linkVerts[ptr++] = p2y; linkVerts[ptr++] = 1;  linkVerts[ptr++] = hwPx; linkVerts[ptr++] = r; linkVerts[ptr++] = g; linkVerts[ptr++] = b;
          linkVerts[ptr++] = p1x; linkVerts[ptr++] = p1y; linkVerts[ptr++] = -1; linkVerts[ptr++] = hwPx; linkVerts[ptr++] = r; linkVerts[ptr++] = g; linkVerts[ptr++] = b;
          linkVerts[ptr++] = p3x; linkVerts[ptr++] = p3y; linkVerts[ptr++] = -1; linkVerts[ptr++] = hwPx; linkVerts[ptr++] = r; linkVerts[ptr++] = g; linkVerts[ptr++] = b;
        }
        prevX = px;
        prevY = py;
        prevNx = nx;
        prevNy = ny;
      }
    }

    let dotCount = 0;
    let dptr = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.depth === 0) continue;
      const [r, g, b] = getLSDRgb(i, now, Math.min(1, Math.hypot(n.vx, n.vy) / (maxVelocity * 0.4)), n.depth, n.baseHue);
      const baseSize = n.depth === 1 ? 6.5 : n.depth === 2 ? 4.8 : 3.4;
      const sizePx = ((n.level || 70) / 85) * baseSize * n.hoverInfluence * dpr;
      dotVerts[dptr++] = n.x * view.scale + view.x;
      dotVerts[dptr++] = n.y * view.scale + view.y;
      dotVerts[dptr++] = sizePx;
      dotVerts[dptr++] = r;
      dotVerts[dptr++] = g;
      dotVerts[dptr++] = b;
      dotCount++;
    }
    return { linkVertCount: ptr / 7, dotCount };
  };

  const isSoftwareRenderer = (() => {
    try {
      if (!gpu) return true;
      const dbg = gpu.gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gpu.gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
      return /SwiftShader|llvmpipe|Software/i.test(renderer);
    } catch {
      return false;
    }
  })();

  const activeDurationMs = prefersReducedMotion || isSoftwareRenderer ? 0 : 1400;

  function scheduleFrame() {
    if (raf === null && !isPaused) raf = requestAnimationFrame(animate);
  }

  let cachedCounts = { linkVertCount: 0, dotCount: 0 };

  function animate() {
    raf = null;
    if (isPaused) return;

    const now = performance.now();
    const isActivePhysics =
      !prefersReducedMotion &&
      ((lastInteractionTime > 0 && now - lastInteractionTime <= activeDurationMs) || Boolean(dragging));
    let energy = 0;

    if (isActivePhysics) {
      energy = stepPhysics(false);
      labelsDirty = true;
    }

    if (!gpu) {
      if (labelsDirty && fallbackCtx) {
        renderLabelsTo2D(fallbackCtx, dpr, now, true);
        labelsDirty = false;
      }
      if (isActivePhysics && (energy >= STABLE_ENERGY_THRESHOLD || now - lastInteractionTime <= activeDurationMs || dragging)) {
        scheduleFrame();
      }
      return;
    }

    const { gl, linkProg, dotProg, blitProg, blurProg, quadBuf, linkBuf, dotBuf, labelTex, fboScene, fboTemp, loc } = gpu;
    const cw = canvas.width;
    const ch = canvas.height;

    if (labelsDirty) {
      // 1. Update lightweight 2D label/portrait texture
      renderLabelsTo2D(labelCtx, labelScale, now, false);
      gl.bindTexture(gl.TEXTURE_2D, labelTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, labelCanvas);

      // 2. Upload tiny GPU link & dot vertex buffers (~50 KB)
      cachedCounts = buildGpuGeometry(now);
      gl.bindBuffer(gl.ARRAY_BUFFER, linkBuf);
      gl.bufferData(gl.ARRAY_BUFFER, linkVerts, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
      gl.bufferData(gl.ARRAY_BUFFER, dotVerts.subarray(0, cachedCounts.dotCount * 6), gl.DYNAMIC_DRAW);

      // 3. Render GPU analytic links + GPU SDF dots + 2D labels into FBO Scene
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboScene.fbo);
      gl.viewport(0, 0, cw, ch);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      // Draw analytic SDF links
      gl.useProgram(linkProg);
      gl.uniform2f(loc.linkVP, width, height);
      gl.bindBuffer(gl.ARRAY_BUFFER, linkBuf);
      const stride = 7 * 4;
      gl.enableVertexAttribArray(loc.linkPos);
      gl.vertexAttribPointer(loc.linkPos, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(loc.linkSide);
      gl.vertexAttribPointer(loc.linkSide, 1, gl.FLOAT, false, stride, 8);
      gl.enableVertexAttribArray(loc.linkHW);
      gl.vertexAttribPointer(loc.linkHW, 1, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(loc.linkCol);
      gl.vertexAttribPointer(loc.linkCol, 3, gl.FLOAT, false, stride, 16);
      gl.drawArrays(gl.TRIANGLES, 0, cachedCounts.linkVertCount);
      gl.disableVertexAttribArray(loc.linkSide);
      gl.disableVertexAttribArray(loc.linkHW);
      gl.disableVertexAttribArray(loc.linkCol);

      // Draw analytic SDF node dots
      gl.useProgram(dotProg);
      gl.uniform2f(loc.dotVP, width, height);
      gl.bindBuffer(gl.ARRAY_BUFFER, dotBuf);
      const dStride = 6 * 4;
      gl.enableVertexAttribArray(loc.dotPos);
      gl.vertexAttribPointer(loc.dotPos, 2, gl.FLOAT, false, dStride, 0);
      gl.enableVertexAttribArray(loc.dotSize);
      gl.vertexAttribPointer(loc.dotSize, 1, gl.FLOAT, false, dStride, 8);
      gl.enableVertexAttribArray(loc.dotCol);
      gl.vertexAttribPointer(loc.dotCol, 3, gl.FLOAT, false, dStride, 12);
      gl.drawArrays(gl.POINTS, 0, cachedCounts.dotCount);
      gl.disableVertexAttribArray(loc.dotSize);
      gl.disableVertexAttribArray(loc.dotCol);

      // Composite 2D labels + portrait on top
      gl.useProgram(blitProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, labelTex);
      gl.uniform1i(loc.blitTex, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.enableVertexAttribArray(loc.blitPos);
      gl.vertexAttribPointer(loc.blitPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      labelsDirty = false;
    }

    // 4. Separable 2-pass radial depth-of-field blur (FBO Scene -> FBO Temp -> Screen)
    const scrollRatio = Math.min(window.scrollY / 800, 1);
    lastScrollBlur = scrollRatio;
    const radiusPx = (prefersReducedMotion ? 0 : 9 + energy * 16) * dpr;
    const scrollBlurPx = scrollRatio * 34 * dpr;

    gl.disable(gl.BLEND);
    gl.useProgram(blurProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(loc.blurPos);
    gl.vertexAttribPointer(loc.blurPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(loc.blurTex, 0);
    gl.uniform1f(loc.blurRadius, radiusPx);
    gl.uniform1f(loc.blurScroll, scrollBlurPx);
    gl.uniform1f(loc.blurEnergy, energy);
    gl.uniform2f(loc.blurMouse, screenMouse.x, screenMouse.y);

    // Pass 1: Horizontal -> fboTemp
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboTemp.fbo);
    gl.viewport(0, 0, cw, ch);
    gl.bindTexture(gl.TEXTURE_2D, fboScene.tex);
    gl.uniform2f(loc.blurDir, 1 / cw, 0);
    gl.uniform1f(loc.blurVignette, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Pass 2: Vertical -> Screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cw, ch);
    gl.bindTexture(gl.TEXTURE_2D, fboTemp.tex);
    gl.uniform2f(loc.blurDir, 0, 1 / ch);
    gl.uniform1f(loc.blurVignette, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    scrollDirty = false;

    if (isActivePhysics && (energy >= STABLE_ENERGY_THRESHOLD || now - lastInteractionTime <= activeDurationMs || dragging)) {
      scheduleFrame();
    } else if (scrollDirty) {
      scheduleFrame();
    }
  }

  // --- 5. Interaction Handlers ---
  const findNodeAtClientPoint = (clientX, clientY, isTouch = false) => {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    screenMouse.x = sx / width;
    screenMouse.y = sy / height;
    const p = { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
    mousePos.x = p.x;
    mousePos.y = p.y;

    const touchPad = isTouch ? 22 : 8;
    let bestNode = null;
    let bestDist = Infinity;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
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

  const isNearAnyNode = (wx, wy) => {
    const r2 = 220 * 220;
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - wx;
      const dy = nodes[i].y - wy;
      if (dx * dx + dy * dy < r2) return true;
    }
    return false;
  };

  const onPointerDown = (e) => {
    if (prefersReducedMotion || window.scrollY > height * 0.85) return;
    if (e.target.closest('a, button, input, textarea, header')) return;
    const { node, worldPoint } = findNodeAtClientPoint(e.clientX, e.clientY, e.pointerType === 'touch');
    if (node) {
      dragging = node;
      node.fx = worldPoint.x;
      node.fy = worldPoint.y;
      lastInteractionTime = performance.now();
      scheduleFrame();
    }
  };

  const onPointerMove = (e) => {
    if (prefersReducedMotion) return;
    if (window.scrollY > height * 1.1 && !dragging) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    screenMouse.x = sx / width;
    screenMouse.y = sy / height;
    const p = { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
    mousePos.x = p.x;
    mousePos.y = p.y;
    if (dragging) {
      dragging.fx = p.x;
      dragging.fy = p.y;
      lastInteractionTime = performance.now();
      if (e.cancelable) e.preventDefault();
    } else if (isNearAnyNode(p.x, p.y)) {
      lastInteractionTime = performance.now();
    }
    scheduleFrame();
  };

  const onPointerUp = () => {
    if (dragging) {
      dragging.fx = null;
      dragging.fy = null;
      dragging = null;
      lastInteractionTime = performance.now();
      scheduleFrame();
    }
  };

  const onTouchStart = (e) => {
    if (prefersReducedMotion || window.scrollY > height * 0.85) return;
    if (e.target.closest('a, button, input, textarea, header')) return;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const { node, worldPoint } = findNodeAtClientPoint(t.clientX, t.clientY, true);
    if (node) {
      dragging = node;
      node.fx = worldPoint.x;
      node.fy = worldPoint.y;
      lastInteractionTime = performance.now();
      if (e.cancelable) e.preventDefault();
      scheduleFrame();
    }
  };

  const onTouchMove = (e) => {
    if (!dragging || e.touches.length !== 1) return;
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    lastInteractionTime = performance.now();
    const rect = canvas.getBoundingClientRect();
    const sx = t.clientX - rect.left;
    const sy = t.clientY - rect.top;
    screenMouse.x = sx / width;
    screenMouse.y = sy / height;
    const p = { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
    mousePos.x = p.x;
    mousePos.y = p.y;
    dragging.fx = p.x;
    dragging.fy = p.y;
    scheduleFrame();
  };

  const onScroll = () => {
    const sy = window.scrollY;
    if (Math.abs(sy - lastScrollY) > 0.5) {
      lastScrollY = sy;
      const nextBlur = Math.min(sy / 800, 1);
      if (Math.abs(nextBlur - lastScrollBlur) > 0.002) {
        scrollDirty = true;
        scheduleFrame();
      }
    }
  };

  const onVisibilityChange = () => {
    isPaused = document.hidden;
    if (!isPaused) {
      labelsDirty = true;
      scheduleFrame();
    } else if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  const onResize = () => resize(false);

  // Load portrait WebP with PNG fallback
  const img = new Image();
  img.onload = () => {
    rootImage = img;
    labelsDirty = true;
    scheduleFrame();
  };
  img.onerror = () => {
    if (!img.src.endsWith('/root-node.png')) img.src = '/root-node.png';
  };
  img.src = '/root-node.webp';

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

  return {
    setFocusMode(next) {
      focusMode = Boolean(next);
      lastInteractionTime = performance.now();
      labelsDirty = true;
      scheduleFrame();
    },
  };
}
