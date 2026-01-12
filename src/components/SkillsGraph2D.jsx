import React, { useEffect, useRef, useMemo } from 'react';
import { cvData } from '../data/cvData';
import { useApp } from '../context/AppContext';

const SkillsGraph2D = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { theme, focusMode } = useApp();
  const focusModeRef = useRef(focusMode);
  useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);
  
  // WebGL and Offscreen buffers
  const glState = useRef({
    gl: null,
    program: null,
    texture: null,
    buffer: null,
    offscreenCanvas: null,
    offscreenCtx: null,
    samples: 32, // Start with higher quality
  });

  const perfState = useRef({
    fps: 60,
    lastTime: performance.now(),
    frameCount: 0,
    lastAdjustment: performance.now()
  });

  const lastInteractionTime = useRef(performance.now());
  const screenMouseRef = useRef({ x: 0.5, y: 0.5 });
  const cachedRepelPoints = useRef([]);
  const lastScrollY = useRef(0);

  const getThemeColors = () => {
    return {
      border: 'rgba(134, 239, 172, 0.15)',
      text: '#ffffff',
      bg: '#050505',
      primary: '#ffffff',
      accent: '#bef264',
    };
  };

  useEffect(() => {
    console.log('SkillsGraph2D: useEffect started');
    const container = containerRef.current;
    if (!container) return;

    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
    let width = window.innerWidth, height = window.innerHeight;

    // --- 1. WebGL & Offscreen Canvas Initialization (MUST BE FIRST) ---
    const initWebGL = () => {
      // Create offscreen canvas for 2D drawing (text/nodes)
      if (!glState.current.offscreenCanvas) {
        glState.current.offscreenCanvas = document.createElement('canvas');
        glState.current.offscreenCtx = glState.current.offscreenCanvas.getContext('2d', { alpha: true });
      }

      // Try to get WebGL context on main canvas
      if (!glState.current.gl) {
        const gl = canvas.getContext('webgl', { antialias: true, alpha: true, stencil: false, depth: false });
        if (!gl) {
          console.error('SkillsGraph2D: WebGL initialization failed');
          return null;
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
          precision highp float;
          varying vec2 vUv;
          uniform sampler2D uTexture;
          uniform vec2 uResolution;
          uniform float uRadius;
          uniform float uEnergy;
          uniform float uScrollBlur;
          uniform float uTime;
          uniform int uSamples;
          uniform vec2 uMouse;
          float random(vec2 uv) { return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec2 center = uMouse;
            float dist = distance(vUv, center);
            float blurAmount = (smoothstep(0.12, 0.55, dist) * uRadius) + uScrollBlur;
            if (blurAmount < 0.2) {
              vec2 texelSize = 1.0 / uResolution;
              vec4 color = vec4(0.0);
              for (int x = 0; x < 2; x++) {
                for (int y = 0; y < 2; y++) {
                  vec2 offset = (vec2(float(x), float(y)) - 0.5) * 0.5;
                  float jitter = random(vUv + vec2(float(x), float(y))) * 0.1;
                  color += texture2D(uTexture, vUv + (offset + jitter) * texelSize);
                }
              }
              gl_FragColor = color / 4.0;
              return;
            }
            vec4 color = vec4(0.0);
            float total = 0.0;
            float goldenAngle = 2.39996;
            float jitter = random(vUv) * 6.28;
            for (int i = 0; i < 64; i++) {
              if (i >= uSamples) break;
              float r = sqrt(float(i) / float(uSamples)) * blurAmount;
              float theta = float(i) * goldenAngle + jitter;
              vec2 offset = vec2(cos(theta), sin(theta)) * r / uResolution;
              if (mod(float(i), 2.0) < 1.0) {
                float aberration = 1.0 + (uEnergy * 0.05 * (blurAmount / (uRadius + 0.1)));
                color.r += texture2D(uTexture, vUv + offset * aberration).r;
                color.g += texture2D(uTexture, vUv + offset).g;
                color.b += texture2D(uTexture, vUv + offset / aberration).b;
              } else { color += texture2D(uTexture, vUv + offset); }
              total += 1.0;
            }
            vec4 finalColor = color / total;
            float grain = (random(vUv + fract(uTime)) - 0.5) * 0.02;
            finalColor.rgb += grain * (blurAmount / uRadius);
            finalColor.rgb *= (1.0 - smoothstep(0.4, 0.8, dist) * 0.1);
            gl_FragColor = finalColor;
          }
        `;
        const createShader = (gl, type, source) => {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        };
        const program = gl.createProgram();
        const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        return { gl, program, buffer, texture };
      }
      return glState.current;
    };

    const webgl = initWebGL();
    if (webgl && webgl.gl) {
      glState.current = { ...glState.current, ...webgl };
    }

    const range = document.createRange();
    const lastRepelCacheUpdate = { current: 0 };
    const repelPoints = { current: [] };

    // --- 2. Utility Functions ---
    const measureLabelWidth = (label, depth = 1) => {
      // Use offscreen context for measuring to avoid locking main canvas to 2D
      const ctx = glState.current.offscreenCtx || canvas.getContext('2d');
      const fontSize = depth === 0 
        ? (window.innerWidth < 768 ? 60 : 120) 
        : (window.innerWidth < 768 ? 16 : 12);
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
      const w = Math.ceil(ctx.measureText(label).width);
      return w + (depth === 0 ? 40 : 10);
    };

    const updateRepelPoints = (forceRefreshCache = false) => {
      const now = performance.now();
      const currentScrollYPos = window.scrollY;
      
      if (forceRefreshCache || now - lastRepelCacheUpdate.current > 2000 || cachedRepelPoints.current.length === 0) {
        const roots = document.querySelectorAll('.repel-target');
        const textNodes = [];
        roots.forEach(root => {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => (node.textContent.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
          });
          let node;
          while (node = walker.nextNode()) textNodes.push(node);
        });

        const points = [];
        const vh = window.innerHeight;
        for (let i = 0; i < textNodes.length; i++) {
          const node = textNodes[i];
          if (!node.isConnected) continue;
          const parentRect = node.parentElement.getBoundingClientRect();
          if (parentRect.bottom < -100 || parentRect.top > vh + 100) continue;
          const text = node.textContent;
          for (let j = 0; j < text.length; j++) {
            if (text[j] === ' ' || text[j] === '\n' || text[j] === '\r' || text[j] === '\t') continue;
            range.setStart(node, j); range.setEnd(node, j + 1);
            const rect = range.getBoundingClientRect();
            points.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 + currentScrollYPos, w: rect.width, h: rect.height });
          }
        }
        cachedRepelPoints.current = points; lastRepelCacheUpdate.current = now;
      }
      repelPoints.current = cachedRepelPoints.current.map(p => ({ ...p, y: p.y - currentScrollYPos }));
      lastScrollY.current = currentScrollYPos;
    };

    const nodes_sim_ref = { current: [] };

    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;

      if (nodes_sim_ref.current && nodes_sim_ref.current.length > 0) {
        const isMobile = width < 768;
        const newName = isMobile ? "Skills" : cvData.personal.name;
        if (nodes_sim_ref.current[0].name !== newName) {
          nodes_sim_ref.current[0].name = newName;
          nodes_sim_ref.current[0].width = measureLabelWidth(newName, 0);
        }
      }

      if (glState.current.offscreenCanvas) {
        glState.current.offscreenCanvas.width = width * dpr;
        glState.current.offscreenCanvas.height = height * dpr;
        if (glState.current.gl) {
          const { gl, texture } = glState.current;
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width * dpr, height * dpr, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.viewport(0, 0, width * dpr, height * dpr);
        }
      }
      updateRepelPoints(true);
    };

    // --- 3. Data Preparation ---
    const buildTree = () => {
      const isMobile = window.innerWidth < 768;
      const root = { name: isMobile ? "Skills" : cvData.personal.name, children: [] };
      const categories = {};
      const uniqueCats = [...new Set(cvData.skills.map(s => s.category))];
      const mapSkill = (skill, baseHue) => ({ name: skill.name, baseHue, children: skill.children ? skill.children.map(c => mapSkill(c, baseHue)) : [] });
      cvData.skills.forEach(skill => {
        if (!categories[skill.category]) {
          const catIndex = uniqueCats.indexOf(skill.category);
          const baseHue = (catIndex / uniqueCats.length) * 360;
          categories[skill.category] = { name: skill.category, children: [], baseHue };
          root.children.push(categories[skill.category]);
        }
        categories[skill.category].children.push(mapSkill(skill, categories[skill.category].baseHue));
      });
      return root;
    };

    const layoutTree = (root, options) => {
      const nodeSizeY = options.nodeHeight || 40, nodeSizeX = options.nodeWidth || 140;
      const nodes = [], links = [], depthToLeaves = new Map();
      function walk(node, depth, parent) {
        const current = { node, depth, x: 0, y: depth * nodeSizeY, parent: null, baseHue: node.baseHue || 0 };
        if (parent) current.parent = parent;
        if (!node.children || node.children.length === 0) {
          const idx = (depthToLeaves.get(depth) || 0); depthToLeaves.set(depth, idx + 1);
          current.x = idx * nodeSizeX;
        } else {
          const children = node.children.map(child => walk(child, depth + 1, current));
          current.x = (Math.min(...children.map(c => c.x)) + Math.max(...children.map(c => c.x))) / 2;
        }
        nodes.push(current); if (current.parent) links.push({ source: current.parent, target: current });
        return current;
      }
      const rootPlaced = walk(root, 0, null), minX = Math.min(...nodes.map(n => n.x));
      nodes.forEach(n => n.x = n.x - minX + options.paddingX);
      return { nodes, links, root: rootPlaced };
    };

    const treeData = buildTree();
    const layout = layoutTree(treeData, { nodeWidth: 200, nodeHeight: 80, paddingX: 40 });
    const rootFixed = { x: 200, y: 150 };
    
    nodes_sim_ref.current = layout.nodes.map(n => {
      const label = n.node.name, w = measureLabelWidth(label, n.depth);
      let initX, initY;
      if (n.depth === 0) { initX = rootFixed.x; initY = rootFixed.y; }
      else {
        const angle = (n.baseHue / 360) * (Math.PI / 2);
        const distance = n.depth === 1 ? 300 : n.depth * 180;
        initX = rootFixed.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 10;
        initY = rootFixed.y + Math.sin(angle) * distance * 0.6 + (Math.random() - 0.5) * 10;
      }
      return { name: label, depth: n.depth, parent: n.parent, baseHue: n.baseHue, x: initX, y: initY, vx: 0, vy: 0, ax: 0, ay: 0, width: w, height: n.depth === 0 ? 80 : 16, fx: null, fy: null, color: n.depth === 1 ? '#bef264' : (n.depth === 2 ? '#86efac' : (n.depth === 3 ? '#93c5fd' : '#ffffff')) };
    });

    const links_sim = layout.links.map(l => ({ source: nodes_sim_ref.current[layout.nodes.indexOf(l.source)], target: nodes_sim_ref.current[layout.nodes.indexOf(l.target)], rest: (l.source.depth === 0 ? 300 : 120) + l.source.depth * 40 }));

    // --- 4. Physics & Animation ---
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => updateRepelPoints());

    const springK = 0.08, damping = 0.05, charge = 6000, centerK = 0.015, maxVelocity = 6.0;
    const domRepelK = 80, edgeRepelK = 1000, edgeMargin = 50;
    const view = { x: 0, y: 0, scale: 1, vx: 0, vy: 0, vs: 0 };
    const viewSpringK = 0.006, viewDamping = 0.90, mousePos = { x: -1000, y: -1000 };
    const STABLE_ENERGY_THRESHOLD = 0.001;
    let dragging = null;

    const lerpColor = (color1, color2, factor) => {
      const parse = (c) => {
        if (c.startsWith('#')) { const hex = parseInt(c.replace('#', ''), 16); return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff, 1.0]; }
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] ? parseFloat(m[4]) : 1.0] : [255, 255, 255, 1.0];
      };
      const [r1, g1, b1, a1] = parse(color1), [r2, g2, b2, a2] = parse(color2);
      return `rgba(${Math.round(r1 + (r2 - r1) * factor)}, ${Math.round(g1 + (g2 - g1) * factor)}, ${Math.round(b1 + (b2 - b1) * factor)}, ${a1 + (a2 - a1) * factor})`;
    };

    const getLSDColor = (index, time, velFactor, depth = 1, baseHue = 0) => {
      if (depth === 0) return '#ffffff';
      
      let hue = depth === 1 ? baseHue : (baseHue + Math.sin(time * 0.0005 + index) * 15 + 360) % 360;
      let s = 0.4, l = 0.8;
      
      if (depth === 1) { s = 0.5; l = 0.85; } 
      else if (depth === 2) { s = 0.3; l = 0.75; } 
      else if (depth === 3) { s = 0.2; l = 0.65; }
      
      // Velocity increases brightness and saturation slightly, rather than shifting to red
      s = Math.min(1.0, s + velFactor * 0.2);
      l = Math.min(1.0, l + velFactor * 0.1);

      const h = hue / 360, q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      const f = (t) => { 
        if (t < 0) t += 1; if (t > 1) t -= 1; 
        if (t < 1/6) return p + (q - p) * 6 * t; 
        if (t < 1/2) return q; 
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; 
        return p; 
      };
      
      return `rgb(${Math.round(f(h+1/3)*255)}, ${Math.round(f(h)*255)}, ${Math.round(f(h-1/3)*255)})`;
    };

    const onPointerDown = (e) => {
      lastInteractionTime.current = performance.now();
      if (e.target.closest('a, button, input, textarea')) return;
      const rect = canvas.getBoundingClientRect();
      screenMouseRef.current = { x: (e.clientX - rect.left) / width, y: (e.clientY - rect.top) / height };
      const p = { x: (e.clientX - rect.left - view.x) / view.scale, y: (e.clientY - rect.top - view.y) / view.scale };
      for (let i = nodes_sim_ref.current.length - 1; i >= 0; i--) {
        const n = nodes_sim_ref.current[i];
        if (Math.abs(p.x - n.x) < (n.width * (n.hoverInfluence || 1))/2 && Math.abs(p.y - n.y) < (n.height * (n.hoverInfluence || 1))/2) { dragging = n; n.fx = p.x; n.fy = p.y; break; }
      }
    };
    const onPointerMove = (e) => {
      lastInteractionTime.current = performance.now();
      const rect = canvas.getBoundingClientRect();
      screenMouseRef.current = { x: (e.clientX - rect.left) / width, y: (e.clientY - rect.top) / height };
      const p = { x: (e.clientX - rect.left - view.x) / view.scale, y: (e.clientY - rect.top - view.y) / view.scale };
      mousePos.x = p.x; mousePos.y = p.y;
      if (dragging) { dragging.fx = p.x; dragging.fy = p.y; if (e.cancelable) e.preventDefault(); }
    };
    const onPointerUp = () => { if (dragging) { dragging.fx = null; dragging.fy = null; dragging = null; } };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let raf, isPaused = false;
    document.addEventListener('visibilitychange', () => isPaused = document.hidden);

    const animate = () => {
      if (isPaused) { raf = requestAnimationFrame(animate); return; }
      const now = performance.now();
      perfState.current.frameCount++;
      if (now - perfState.current.lastTime >= 1000) {
        perfState.current.fps = (perfState.current.frameCount * 1000) / (now - perfState.current.lastTime);
        perfState.current.frameCount = 0; perfState.current.lastTime = now;
        if (now - perfState.current.lastAdjustment > 2000) {
          if (perfState.current.fps < 45 && glState.current.samples > 8) glState.current.samples -= 4;
          else if (perfState.current.fps > 58 && glState.current.samples < 64) glState.current.samples += 4;
          perfState.current.lastAdjustment = now;
        }
      }

      updateRepelPoints();
      const nodes = nodes_sim_ref.current;
      nodes.forEach(n => { 
        n.ax = 0; n.ay = 0; 
        const dist = Math.hypot(n.x-mousePos.x, n.y-mousePos.y);
        // More subtle expansion: max 20% instead of 100%
        n.hoverInfluence = 1.0 + 0.2 * Math.exp(-(dist**2) / (2 * 150 * 150)); 
      });

      links_sim.forEach(l => {
        const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y, dist = Math.hypot(dx, dy) || 1, force = springK * (dist - l.rest);
        l.source.ax += force * (dx/dist); l.source.ay += force * (dy/dist);
        l.target.ax -= force * (dx/dist); l.target.ay -= force * (dy/dist);
      });

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y, dist2 = Math.max(36, dx*dx + dy*dy), dist = Math.sqrt(dist2);
          let currCharge = charge * a.hoverInfluence * b.hoverInfluence;
          if (a.depth === 0 || b.depth === 0) currCharge *= 30;
          else if (a.depth === 1 && b.depth === 1) currCharge *= 25; // Even more space between categories
          else if (a.parent !== b.parent) {
            // Strong repulsion between nodes from different branches to keep clusters distinct
            currCharge *= 15;
          }
          else if (a.depth >= 2 && b.depth >= 2 && a.parent === b.parent) {
            const force = 0.1 * (dist - (a.depth === 2 ? 100 : 60));
            a.ax += force * (dx/dist); a.ay += force * (dy/dist); b.ax -= force * (dx/dist); b.ay -= force * (dy/dist); continue;
          }
          const force = currCharge / dist2; a.ax -= force * (dx/dist); a.ay -= force * (dy/dist); b.ax += force * (dx/dist); b.ay += force * (dy/dist);
        }
        repelPoints.current.forEach(p => {
          const dx = a.x - (p.x - view.x)/view.scale, dy = a.y - (p.y - view.y)/view.scale;
          const d2 = dx*dx + dy*dy, minDist = Math.max(p.w, p.h)/view.scale/2 + 30;
          if (d2 < minDist*minDist) { const d = Math.sqrt(d2) || 1, force = (domRepelK * (1 - d/minDist))/d; a.ax += dx*force; a.ay += dy*force; }
        });
        const sx = a.x * view.scale + view.x, sy = a.y * view.scale + view.y;
        if (sx < edgeMargin) a.ax += (edgeRepelK * (1 - sx/edgeMargin))/view.scale; else if (sx > width - edgeMargin) a.ax -= (edgeRepelK * (1 - (width-sx)/edgeMargin))/view.scale;
        if (sy < edgeMargin) a.ay += (edgeRepelK * (1 - sy/edgeMargin))/view.scale; else if (sy > height - edgeMargin) a.ay -= (edgeRepelK * (1 - (height-sy)/edgeMargin))/view.scale;
      }

      const cx = (width + (width >= 768 && !focusModeRef.current ? 320 : 0))/2, cy = height/2;
      nodes.forEach(n => {
        n.ax += (cx - n.x) * centerK; n.ay += (cy - n.y) * (centerK * 4);
        if (n.hoverInfluence > 1) { n.ax += (cx - n.x) * (n.hoverInfluence-1) * 0.08; n.ay += (cy - n.y) * (n.hoverInfluence-1) * 0.08; }
        if (n.fx !== null) { n.x = n.fx; n.vx = 0; } if (n.fy !== null) { n.y = n.fy; n.vy = 0; }
        n.vx = (n.vx + n.ax) * damping; n.vy = (n.vy + n.ay) * damping;
        if (Math.abs(n.vx) > maxVelocity) n.vx = Math.sign(n.vx) * maxVelocity;
        if (Math.abs(n.vy) > maxVelocity) n.vy = Math.sign(n.vy) * maxVelocity;
        if (n.fx === null) n.x += n.vx; if (n.fy === null) n.y += n.vy;
      });

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => { minX = Math.min(minX, n.x - n.width/2); maxX = Math.max(maxX, n.x + n.width/2); minY = Math.min(minY, n.y - n.height/2); maxY = Math.max(maxY, n.y + n.height/2); });
      const targetScale = Math.max(0.6, Math.min(1.5, Math.min((width - (width >= 768 && !focusModeRef.current ? 320 : 0) - 200)/(maxX-minX||100), (height-500)/(maxY-minY||100))));
      const targetX = (width + (width >= 768 && !focusModeRef.current ? 320 : 0))/2 - targetScale * (minX+maxX)/2, targetY = height/2 - targetScale * (minY+maxY)/2;
      view.vx = (view.vx + (targetX - view.x) * viewSpringK) * viewDamping; view.vy = (view.vy + (targetY - view.y) * viewSpringK) * viewDamping; view.vs = (view.vs + (targetScale - view.scale) * viewSpringK) * viewDamping;
      view.x += view.vx; view.y += view.vy; view.scale += view.vs;

      let totalVel = 0; nodes.forEach(n => totalVel += Math.hypot(n.vx, n.vy));
      const energy = Math.min(1.0, totalVel / (nodes.length * 2.0));
      if (energy < STABLE_ENERGY_THRESHOLD && now - lastInteractionTime.current > 3000 && !dragging) { raf = requestAnimationFrame(animate); return; }

      const ctx2d = glState.current.offscreenCtx || canvas.getContext('2d');
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0); ctx2d.clearRect(0, 0, width, height);
      ctx2d.save(); ctx2d.translate(view.x, view.y); ctx2d.scale(view.scale, view.scale);
      links_sim.forEach((l, idx) => {
        const color = getLSDColor(idx, now, Math.min(1, (Math.hypot(l.source.vx, l.source.vy)+Math.hypot(l.target.vx, l.target.vy))/2/(maxVelocity*0.4)), l.target.depth, l.target.baseHue);
        const setAlpha = (c, a) => c.startsWith('rgba') ? c.replace(/,[\s\d.]+\)$/, `, ${a})`) : c.replace('rgb', 'rgba').replace(')', `, ${a})`);
        const midX = (l.source.x + l.target.x)/2, midY = (l.source.y + l.target.y)/2, cpX = midX + (cx - midX) * 0.15, cpY = midY + (cy - midY) * 0.15, w = (l.source.depth === 0 ? 3 : (l.source.depth === 1 ? 1.5 : 0.8))/view.scale;
        ctx2d.lineCap = 'round'; ctx2d.lineJoin = 'round'; ctx2d.beginPath(); ctx2d.moveTo(l.source.x, l.source.y); ctx2d.quadraticCurveTo(cpX, cpY, l.target.x, l.target.y);
        ctx2d.strokeStyle = setAlpha(color, 0.04); ctx2d.lineWidth = w * 4; ctx2d.stroke(); // Subtle glow
        ctx2d.strokeStyle = setAlpha(color, 0.15); ctx2d.lineWidth = w; ctx2d.stroke(); // Core line
      });
      nodes.forEach((n, idx) => {
        const color = getLSDColor(idx, now, Math.min(1, Math.hypot(n.vx, n.vy)/(maxVelocity*0.4)), n.depth, n.baseHue);
        
        if (n.depth !== 0) { 
          ctx2d.fillStyle = color; 
          ctx2d.beginPath(); 
          ctx2d.arc(n.x, n.y, (1.8 * n.hoverInfluence)/view.scale, 0, Math.PI*2); 
          ctx2d.fill(); 
        }

        // Use a dark, semi-transparent outline for readability against background elements
        ctx2d.strokeStyle = 'rgba(5, 5, 5, 0.9)'; 
        ctx2d.lineJoin = 'round';
        
        if (n.depth === 0) {
          const fontSize = (window.innerWidth < 768 ? 50 : 100) * n.hoverInfluence;
          ctx2d.font = `900 ${fontSize}px "Inter", sans-serif`; 
          ctx2d.textAlign = 'center'; 
          ctx2d.textBaseline = 'middle'; 
          ctx2d.letterSpacing = '-2px';
          ctx2d.lineWidth = 6 * n.hoverInfluence; 
          ctx2d.strokeText(n.name.toUpperCase(), n.x, n.y); 
          ctx2d.fillStyle = '#ffffff';
          ctx2d.fillText(n.name.toUpperCase(), n.x, n.y); 
          ctx2d.letterSpacing = '0px';
        } else {
          const fontSize = (window.innerWidth < 768 ? 14 : 11) * n.hoverInfluence;
          ctx2d.font = `600 ${fontSize}px "Inter", sans-serif`; 
          ctx2d.textAlign = 'center'; 
          ctx2d.textBaseline = 'bottom';
          ctx2d.lineWidth = 3 * n.hoverInfluence; 
          ctx2d.strokeText(n.name, n.x, n.y - 12/view.scale); 
          ctx2d.fillStyle = color;
          ctx2d.fillText(n.name, n.x, n.y - 12/view.scale);
        }
      });
      ctx2d.restore();

      if (glState.current.gl) {
        const { gl, program, texture, buffer, offscreenCanvas } = glState.current;
        gl.useProgram(program); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), offscreenCanvas.width, offscreenCanvas.height);
        gl.uniform1f(gl.getUniformLocation(program, 'uRadius'), (10 + energy * 20) * dpr);
        gl.uniform1f(gl.getUniformLocation(program, 'uScrollBlur'), Math.min(window.scrollY/800, 1) * 40 * dpr);
        gl.uniform1f(gl.getUniformLocation(program, 'uEnergy'), energy);
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), performance.now()/1000);
        gl.uniform1i(gl.getUniformLocation(program, 'uSamples'), glState.current.samples);
        gl.uniform2f(gl.getUniformLocation(program, 'uMouse'), screenMouseRef.current.x, screenMouseRef.current.y);
        const posLoc = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(raf);
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full z-0 bg-[#050505] overflow-hidden pointer-events-none">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{ touchAction: 'none' }} />
    </div>
  );
};

export default SkillsGraph2D;
