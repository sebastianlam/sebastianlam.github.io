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
    samples: 16, // Current dynamic samples
  });

  const perfState = useRef({
    fps: 60,
    lastTime: performance.now(),
    frameCount: 0,
    lastAdjustment: performance.now()
  });

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
    const container = containerRef.current;
    if (!container) return;

    // --- Data Preparation ---
    const buildTree = () => {
      const root = { name: 'Skills', children: [] };
      const categories = {};
      
      // Get unique category names to calculate equidistant hues
      const uniqueCats = [...new Set(cvData.skills.map(s => s.category))];
      
      const mapSkill = (skill, baseHue) => ({
        name: skill.name,
        baseHue,
        children: skill.children ? skill.children.map(c => mapSkill(c, baseHue)) : []
      });

      cvData.skills.forEach(skill => {
        if (!categories[skill.category]) {
          const catIndex = uniqueCats.indexOf(skill.category);
          const baseHue = (catIndex / uniqueCats.length) * 360;
          categories[skill.category] = { 
            name: skill.category, 
            children: [],
            baseHue: baseHue
          };
          root.children.push(categories[skill.category]);
        }
        categories[skill.category].children.push(mapSkill(skill, categories[skill.category].baseHue));
      });
      
      return root;
    };

    const treeData = buildTree();

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
          baseHue: node.baseHue || 0 
        };
        if (parent) current.parent = parent;
        if (!node.children || node.children.length === 0) {
          const idx = (depthToLeaves.get(depth) || 0);
          depthToLeaves.set(depth, idx + 1);
          current.x = idx * nodeSizeX;
        } else {
          const children = node.children.map(child => walk(child, depth + 1, current));
          const minX = Math.min(...children.map(c => c.x));
          const maxX = Math.max(...children.map(c => c.x));
          current.x = (minX + maxX) / 2;
        }
        nodes.push(current);
        if (current.parent) links.push({ source: current.parent, target: current });
        return current;
      }
      const rootPlaced = walk(root, 0, null);
      const minX = Math.min(...nodes.map(n => n.x));
      nodes.forEach(n => n.x = n.x - minX + options.paddingX);
      return { nodes, links, root: rootPlaced };
    };

    const layout = layoutTree(treeData, { nodeWidth: 200, nodeHeight: 80, paddingX: 40 });

    const canvas = canvasRef.current;
    
    // --- WebGL Initialization ---
    const initWebGL = () => {
      const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
      if (!gl) return null;

      const vsSource = `
        attribute vec2 position;
        varying vec2 vUv;
        void main() {
          vUv = position * 0.5 + 0.5;
          vUv.y = 1.0 - vUv.y; // Flip Y for canvas texture
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

        float random(vec2 uv) {
          return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Optical-style falloff (vignette) + Scroll-based global blur
          float blurAmount = (smoothstep(0.12, 0.55, dist) * uRadius) + uScrollBlur;
          
          if (blurAmount < 0.2) {
            // 16x MSAA (Jittered Grid) for ultra-smooth 2D rendering
            vec2 texelSize = 1.0 / uResolution;
            vec4 color = vec4(0.0);
            
            // 4x4 Jittered Grid for superior edge smoothing
            for (int x = 0; x < 4; x++) {
              for (int y = 0; y < 4; y++) {
                vec2 offset = (vec2(float(x), float(y)) - 1.5) * 0.25;
                // Add a small jitter based on position for even better smoothing
                float jitter = random(vUv + vec2(float(x), float(y))) * 0.1;
                color += texture2D(uTexture, vUv + (offset + jitter) * texelSize);
              }
            }
            
            gl_FragColor = color / 16.0;
            return;
          }

          vec4 color = vec4(0.0);
          float total = 0.0;
          
          // Poisson Disk-style sampling for true optical Gaussian feel
          float goldenAngle = 2.39996; // Golden angle in radians
          float jitter = random(vUv) * 6.28;
          
          // WebGL 1.0 requires constant loop limit, so we use a max and break
          for (int i = 0; i < 32; i++) {
            if (i >= uSamples) break;
            
            float r = sqrt(float(i) / float(uSamples)) * blurAmount;
            float theta = float(i) * goldenAngle + jitter;
            vec2 offset = vec2(cos(theta), sin(theta)) * r / uResolution;
            
            // Optimization: Only apply chromatic aberration to every other sample
            if (mod(float(i), 2.0) < 1.0) {
              float aberration = 1.0 + (uEnergy * 0.15 * (blurAmount / uRadius));
              color.r += texture2D(uTexture, vUv + offset * aberration).r;
              color.g += texture2D(uTexture, vUv + offset).g;
              color.b += texture2D(uTexture, vUv + offset / aberration).b;
            } else {
              color += texture2D(uTexture, vUv + offset);
            }
            total += 1.0;
          }
          
          vec4 finalColor = color / total;

          // Animated Grain/Noise
          float grain = (random(vUv + fract(uTime)) - 0.5) * 0.05;
          // Only apply grain to blurred areas to simulate "frosted" look
          finalColor.rgb += grain * (blurAmount / uRadius);
          
          // Subtle darkening at the very edges (mechanical vignette)
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
    };

    if (!glState.current.gl) {
      const webgl = initWebGL();
      if (webgl) {
        glState.current = { ...glState.current, ...webgl };
        // Create offscreen 2D canvas
        glState.current.offscreenCanvas = document.createElement('canvas');
        glState.current.offscreenCtx = glState.current.offscreenCanvas.getContext('2d');
      }
    }

    const ctx = glState.current.offscreenCtx || canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.imageSmoothingQuality = 'high';
    
    let width, height;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (glState.current.offscreenCanvas) {
        glState.current.offscreenCanvas.width = width * dpr;
        glState.current.offscreenCanvas.height = height * dpr;
        
        // Ensure texture is resized on GPU
        if (glState.current.gl) {
          const { gl, texture } = glState.current;
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 
            glState.current.offscreenCanvas.width, 
            glState.current.offscreenCanvas.height, 
            0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
      }

      if (glState.current.gl) {
        glState.current.gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const baseFontSize = window.innerWidth < 768 ? 16 : 12;
    const baseFont = `bold ${baseFontSize}px "Inter", sans-serif`;
    ctx.font = baseFont;

    const measureLabelWidth = (label) => {
      ctx.font = baseFont;
      const w = Math.ceil(ctx.measureText(label).width);
      return w + 10;
    };

    const rootFixed = { x: width / 2, y: height / 2 };
    const nodes_sim = layout.nodes.map(n => {
      const label = n.node.name;
      const w = measureLabelWidth(label);

      // Radial Seeding: Distribute nodes by group (baseHue) and depth
      let initX, initY;
      if (n.depth === 0) {
        initX = rootFixed.x;
        initY = rootFixed.y;
      } else {
        const angle = (n.baseHue * Math.PI) / 180;
        const distance = n.depth * 180;
        const jitter = 10;
        const flatteningFactor = 0.4; // Squash vertically
        initX = rootFixed.x + Math.cos(angle) * distance + (Math.random() - 0.5) * jitter;
        initY = rootFixed.y + Math.sin(angle) * distance * flatteningFactor + (Math.random() - 0.5) * jitter;
      }

      return {
        name: label,
        depth: n.depth,
        parent: n.parent, // Store parent reference for hierarchy forces
        baseHue: n.baseHue, // Store base hue for psychedelic effects
        x: initX,
        y: initY,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        width: w,
        height: 16,
        fx: null,
        fy: null,
        color: n.depth === 1 ? '#bef264' : (n.depth === 2 ? '#86efac' : (n.depth === 3 ? '#93c5fd' : '#ffffff'))
      };
    });

    const links_sim = layout.links.map(l => ({
      source: nodes_sim[layout.nodes.indexOf(l.source)],
      target: nodes_sim[layout.nodes.indexOf(l.target)],
      rest: 120 + l.source.depth * 40
    }));

    // --- Physics ---
    const springK = 0.08;
    const damping = 0.05;
    const charge = 6000;
    const centerK = 0.02;
    const maxVelocity = 6.0;
    const domRepelK = 80;
    const edgeRepelK = 1000;
    const edgeMargin = 50;

    const view = { x: 0, y: 0, scale: 1, vx: 0, vy: 0, vs: 0 };
    const viewSpringK = 0.006;
    const viewDamping = 0.90;

    // --- Interaction ---
    let dragging = null;
    let repelPoints = [];
    let cachedTextNodes = [];
    let lastRepelCacheUpdate = 0;
    const range = document.createRange();

    const updateRepelPoints = (forceRefreshCache = false) => {
      const now = performance.now();
      
      // Refresh the list of text nodes every 2 seconds or if forced
      if (forceRefreshCache || now - lastRepelCacheUpdate > 2000 || cachedTextNodes.length === 0) {
        const roots = document.querySelectorAll('.repel-target');
        const textNodes = [];
        
        roots.forEach(root => {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              if (node.textContent.trim().length > 0) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_SKIP;
            }
          });

          let node;
          while (node = walker.nextNode()) {
            textNodes.push(node);
          }
        });
        cachedTextNodes = textNodes;
        lastRepelCacheUpdate = now;
      }

      // Update rects for all characters in cached text nodes every frame
      const points = [];
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      
      for (let i = 0; i < cachedTextNodes.length; i++) {
        const node = cachedTextNodes[i];
        if (!node.isConnected) continue;
        
        // Quick check if the parent element is roughly in view before processing characters
        const parentRect = node.parentElement.getBoundingClientRect();
        if (parentRect.bottom < -50 || parentRect.top > vh + 50 || parentRect.right < -50 || parentRect.left > vw + 50) {
          continue;
        }

        const text = node.textContent;
        for (let j = 0; j < text.length; j++) {
          // Skip whitespace
          if (text[j] === ' ' || text[j] === '\n' || text[j] === '\r' || text[j] === '\t') continue;
          
          range.setStart(node, j);
          range.setEnd(node, j + 1);
          const rect = range.getBoundingClientRect();
          
          if (rect.bottom > -20 && rect.top < vh + 20) {
            points.push({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              w: rect.width,
              h: rect.height
            });
          }
        }
      }
      repelPoints = points;
    };

    const getPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const toWorld = (p) => ({
      x: (p.x - view.x) / view.scale,
      y: (p.y - view.y) / view.scale
    });

    const lerpColor = (color1, color2, factor) => {
      const parse = (c) => {
        if (c.startsWith('#')) {
          const hex = parseInt(c.replace('#', ''), 16);
          return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff, 1.0];
        }
        if (c.startsWith('hsl')) {
          // Simple approximation for HSL to RGB if needed, but we'll try to stick to RGB/RGBA for lerping
          const m = c.match(/hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/);
          if (m) {
            const h = parseInt(m[1]) / 360, s = parseInt(m[2]) / 100, l = parseInt(m[3]) / 100;
            let r, g, b;
            if (s === 0) r = g = b = l;
            else {
              const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
              };
              const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
              const p = 2 * l - q;
              r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
            }
            return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), m[4] ? parseFloat(m[4]) : 1.0];
          }
        }
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] ? parseFloat(m[4]) : 1.0] : [255, 255, 255, 1.0];
      };
      const [r1, g1, b1, a1] = parse(color1);
      const [r2, g2, b2, a2] = parse(color2);
      const r = Math.round(r1 + (r2 - r1) * factor);
      const g = Math.round(g1 + (g2 - g1) * factor);
      const b = Math.round(b1 + (b2 - b1) * factor);
      const a = a1 + (a2 - a1) * factor;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    };

    const hit = (x, y) => {
      for (let i = nodes_sim.length - 1; i >= 0; i--) {
        const n = nodes_sim[i];
        if (Math.abs(x - n.x) < n.width/2 && Math.abs(y - n.y) < n.height/2) return n;
      }
      return null;
    };

    const onPointerDown = (e) => {
      // Don't intercept if clicking an interactive element (link, button, etc)
      if (e.target.closest('a, button, input, textarea')) return;

      const p = toWorld(getPointer(e));
      const n = hit(p.x, p.y);
      if (n) {
        dragging = n;
        n.fx = p.x; n.fy = p.y;
      }
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const p = toWorld(getPointer(e));
      dragging.fx = p.x; dragging.fy = p.y;
      // Prevent scrolling when dragging a node
      if (e.cancelable) e.preventDefault();
    };
    const onPointerUp = (e) => {
      if (dragging) {
        dragging.fx = null; dragging.fy = null;
        dragging = null;
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const roundRect = (c, x, y, w, h, r) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    };

    let raf;
    let isPaused = false;

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const getLSDColor = (index, time, velFactor, depth = 1, baseHue = 0) => {
      // Different depths shift at different speeds and offsets
      let hue;
      if (depth === 0) {
        // Root stays white-ish rainbow
        hue = (time * 0.05 + index * 15) % 360;
      } else if (depth === 1) {
        // Categories have a static equidistant hue
        hue = baseHue;
      } else {
        // Skill items shift within range of parent node (+/- 30 degrees)
        const range = 30;
        const shift = Math.sin(time * 0.001 + index) * range;
        hue = (baseHue + shift + 360) % 360;
      }
      
      // Hierarchy based on depth:
      // Depth 0 (Root): High lightness, low saturation (Ethereal White-ish Rainbow)
      // Depth 1 (Category): High saturation, mid lightness (Vibrant Punchy)
      // Depth 2 (Skill): Mid saturation, lower lightness (Deep Detailed)
      // Depth 3+ (Sub-skill): Lower saturation, lower lightness
      let s = 0.8, l = 0.6;
      if (depth === 0) { s = 0.3; l = 0.9; }
      else if (depth === 1) { s = 0.9; l = 0.6; }
      else if (depth === 2) { s = 0.6; l = 0.5; }
      else if (depth === 3) { s = 0.5; l = 0.4; }
      else { s = 0.4; l = 0.3; }

      // Convert HSL to RGB for lerpColor
      const h = hue / 360;
      let r, g, b;
      if (s === 0) r = g = b = l;
      else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1; if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1/3);
      }
      const baseColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      const fastRed = '#ef4444';
      return velFactor > 0.05 ? lerpColor(baseColor, fastRed, velFactor) : baseColor;
    };

    const animate = () => {
      if (isPaused) {
        raf = requestAnimationFrame(animate);
        return;
      }
      const now = performance.now();

      // --- Performance Tracking & Dynamic Quality ---
      perfState.current.frameCount++;
      const timeSinceLastFPS = now - perfState.current.lastTime;
      if (timeSinceLastFPS >= 1000) {
        perfState.current.fps = (perfState.current.frameCount * 1000) / timeSinceLastFPS;
        perfState.current.frameCount = 0;
        perfState.current.lastTime = now;

        // Adjust samples every second based on FPS
        if (now - perfState.current.lastAdjustment > 2000) {
          if (perfState.current.fps < 45 && glState.current.samples > 8) {
            glState.current.samples = Math.max(8, glState.current.samples - 4);
            perfState.current.lastAdjustment = now;
          } else if (perfState.current.fps > 58 && glState.current.samples < 32) {
            glState.current.samples = Math.min(32, glState.current.samples + 2);
            perfState.current.lastAdjustment = now;
          }
        }
      }

      // Update DOM repel points every frame to match WebGL FPS
      updateRepelPoints();

      // Step Physics
      nodes_sim.forEach(n => { n.ax = 0; n.ay = 0; });

      links_sim.forEach(l => {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const force = springK * (dist - l.rest);
        l.source.ax += force * (dx / dist);
        l.source.ay += force * (dy / dist);
        l.target.ax -= force * (dx / dist);
        l.target.ay -= force * (dx / dist);
      });

      for (let i = 0; i < nodes_sim.length; i++) {
        const a = nodes_sim[i];
        
        // Node-Node Repulsion & Hierarchy-specific forces
        for (let j = i + 1; j < nodes_sim.length; j++) {
          const b = nodes_sim[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = Math.max(36, dx*dx + dy*dy);
          const dist = Math.sqrt(dist2);
          
          let currentCharge = charge;

          // 1. Very strong repulsion between skill categories (Level 1)
          if (a.depth === 1 && b.depth === 1) {
            currentCharge = charge * 12.0; 
          }
          // 2. Attraction between sibling nodes (Level 2+) with a minimum distance
          else if (a.depth >= 2 && b.depth >= 2 && a.parent === b.parent) {
            // Use a spring-like force with a rest length to ensure readability
            const restLength = a.depth === 2 ? 100 : 60; 
            const k = 0.1; 
            const force = k * (dist - restLength);
            const fx = force * (dx / dist);
            const fy = force * (dy / dist);
            a.ax += fx; a.ay += fy;
            b.ax -= fx; b.ay -= fy;
            continue; // Skip the standard repulsion logic
          }
          
          const force = currentCharge / dist2;
          const fx = force * (dx / dist);
          const fy = force * (dy / dist);
          a.ax -= fx; a.ay -= fy;
          b.ax += fx; b.ay += fy;
        }

        // DOM Element Repulsion
        const nodeX = a.x;
        const nodeY = a.y;
        
        repelPoints.forEach(p => {
          // Convert DOM screen space to simulation world space
          const px = (p.x - view.x) / view.scale;
          const py = (p.y - view.y) / view.scale;
          
          const dx = nodeX - px;
          const dy = nodeY - py;
          const d2 = dx * dx + dy * dy;
          
          const pw = p.w / view.scale;
          const ph = p.h / view.scale;
          const minDist = Math.max(pw, ph) / 2 + 30;
          const minDist2 = minDist * minDist;

          if (d2 < minDist2) {
            const dist = Math.sqrt(d2) || 1;
            const force = (domRepelK * (1 - dist / minDist)) / dist;
            a.ax += dx * force;
            a.ay += dy * force;
          }
        });

        // Edge Repulsion
        // Convert node world pos to screen pos for edge check
        const screenX = a.x * view.scale + view.x;
        const screenY = a.y * view.scale + view.y;
        
        if (screenX < edgeMargin) {
          const force = (edgeRepelK * (1 - screenX / edgeMargin)) / view.scale;
          a.ax += force;
        } else if (screenX > width - edgeMargin) {
          const force = (edgeRepelK * (1 - (width - screenX) / edgeMargin)) / view.scale;
          a.ax -= force;
        }
        
        if (screenY < edgeMargin) {
          const force = (edgeRepelK * (1 - screenY / edgeMargin)) / view.scale;
          a.ay += force;
        } else if (screenY > height - edgeMargin) {
          const force = (edgeRepelK * (1 - (height - screenY) / edgeMargin)) / view.scale;
          a.ay -= force;
        }
      }

      const isDesktop = width >= 768;
      const sidebarWidth = (isDesktop && !focusModeRef.current) ? 320 : 0;
      const cx = (width + sidebarWidth) / 2, cy = height / 2;
      nodes_sim.forEach((n, i) => {
        n.ax += (cx - n.x) * centerK;
        // Apply stronger centering on Y to keep the layout flat
        n.ay += (cy - n.y) * (centerK * 4.0);
        if (n.fx !== null) { n.x = n.fx; n.vx = 0; }
        if (n.fy !== null) { n.y = n.fy; n.vy = 0; }
        n.vx = (n.vx + n.ax) * damping;
        n.vy = (n.vy + n.ay) * damping;
        
        if (n.vx > maxVelocity) n.vx = maxVelocity; else if (n.vx < -maxVelocity) n.vx = -maxVelocity;
        if (n.vy > maxVelocity) n.vy = maxVelocity; else if (n.vy < -maxVelocity) n.vy = -maxVelocity;
        if (n.fx === null) n.x += n.vx;
        if (n.fy === null) n.y += n.vy;
      });

      // View spring towards fit-to-bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes_sim.forEach(n => {
        minX = Math.min(minX, n.x - n.width/2);
        maxX = Math.max(maxX, n.x + n.width/2);
        minY = Math.min(minY, n.y - n.height/2);
        maxY = Math.max(maxY, n.y + n.height/2);
      });
      const margin = 100;
      const vMargin = 250; // Larger vertical margin to discourage vertical expansion
      const worldW = maxX - minX || 100;
      const worldH = maxY - minY || 100;
      const targetScale = Math.max(0.6, Math.min(1.5, Math.min((width - sidebarWidth - margin*2) / worldW, (height - vMargin*2) / worldH)));
      const targetX = (width + sidebarWidth) / 2 - targetScale * (minX + maxX) / 2;
      const targetY = height / 2 - targetScale * (minY + maxY) / 2;

      view.vx = (view.vx + (targetX - view.x) * viewSpringK) * viewDamping;
      view.vy = (view.vy + (targetY - view.y) * viewSpringK) * viewDamping;
      view.vs = (view.vs + (targetScale - view.scale) * viewSpringK) * viewDamping;
      view.x += view.vx; view.y += view.vy; view.scale += view.vs;

      // Calculate System Energy (for visual effects)
      let totalVel = 0;
      nodes_sim.forEach(n => totalVel += Math.hypot(n.vx, n.vy));
      const energy = Math.min(1.0, totalVel / (nodes_sim.length * 2.0));

      // Draw Main Canvas
      const colors = getThemeColors();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
      ctx.clearRect(0, 0, width, height);
      
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);

      // Links
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      links_sim.forEach((l, idx) => {
        const vel = (Math.hypot(l.source.vx, l.source.vy) + Math.hypot(l.target.vx, l.target.vy)) / 2;
        const velFactor = Math.min(1.0, vel / (maxVelocity * 0.4));
        const lsdColor = getLSDColor(idx, now, velFactor, l.target.depth, l.target.baseHue);
        
        // Helper to safely set alpha on both rgb and rgba strings
        const setAlpha = (color, alpha) => {
          if (color.startsWith('rgba')) {
            return color.replace(/,[\s\d.]+\)$/, `, ${alpha})`);
          }
          return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        };
        
        // Calculate organic curve control point (pull towards center)
        const midX = (l.source.x + l.target.x) / 2;
        const midY = (l.source.y + l.target.y) / 2;
        const pull = 0.15; // How much to pull toward center
        const cpX = midX + (cx - midX) * pull;
        const cpY = midY + (cy - midY) * pull;

        // Hierarchical width
        const baseWidth = l.source.depth === 0 ? 3.0 : (l.source.depth === 1 ? 1.5 : 0.8);
        const scaleAdjustedWidth = baseWidth / view.scale;

        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.quadraticCurveTo(cpX, cpY, l.target.x, l.target.y);

        // Pass 1: The "Aura" (Soft anti-aliasing glow)
        ctx.strokeStyle = setAlpha(lsdColor, 0.15);
        ctx.lineWidth = scaleAdjustedWidth * 4;
        ctx.stroke();

        // Pass 2: The "Core" (Sharp connection)
        ctx.strokeStyle = setAlpha(lsdColor, 0.5);
        ctx.lineWidth = scaleAdjustedWidth;
        ctx.stroke();
      });

      // Nodes
      nodes_sim.forEach((n, idx) => {
        // Velocity-dependent color shift
        const vel = Math.hypot(n.vx, n.vy);
        const velFactor = Math.min(1.0, vel / (maxVelocity * 0.4));
        
        const nodeColor = getLSDColor(idx, now, velFactor, n.depth, n.baseHue);
        
        // Draw Nucleus
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.5 / view.scale, 0, Math.PI * 2);
        ctx.fill();

        // Add glow for active/fast nodes
        if (velFactor > 0.2) {
          ctx.shadowBlur = 15 * velFactor;
          ctx.shadowColor = nodeColor;
        }

        // Label Presentation (Offset above nucleus)
        const fontSize = window.innerWidth < 768 ? 16 : 12;
        ctx.font = `bold ${fontSize}px "Inter"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(n.name, n.x, n.y - (10 / view.scale));
        
        ctx.shadowBlur = 0;
      });
      ctx.restore();

      // --- WebGL Post-Processing ---
      if (glState.current.gl) {
        const { gl, program, texture, buffer, offscreenCanvas } = glState.current;
        
        gl.useProgram(program);
        
        // Upload 2D canvas to texture using faster texSubImage2D
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
        
        // Set uniforms
        const resLoc = gl.getUniformLocation(program, 'uResolution');
        gl.uniform2f(resLoc, offscreenCanvas.width, offscreenCanvas.height);
        
        const radLoc = gl.getUniformLocation(program, 'uRadius');
        // Pulse radius slightly with energy (reduced intensity)
        gl.uniform1f(radLoc, (10.0 + energy * 20.0) * dpr); 

        const scrollBlurLoc = gl.getUniformLocation(program, 'uScrollBlur');
        const scrollFactor = Math.min(window.scrollY / 800, 1.0);
        gl.uniform1f(scrollBlurLoc, scrollFactor * 40.0 * dpr);
        
        const energyLoc = gl.getUniformLocation(program, 'uEnergy');
        gl.uniform1f(energyLoc, energy);
        
        const timeLoc = gl.getUniformLocation(program, 'uTime');
        gl.uniform1f(timeLoc, performance.now() / 1000.0);
        
        const samplesLoc = gl.getUniformLocation(program, 'uSamples');
        gl.uniform1i(samplesLoc, glState.current.samples);
        
        const posLoc = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
