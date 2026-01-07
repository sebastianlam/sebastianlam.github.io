import React, { useEffect, useRef, useMemo } from 'react';
import { cvData } from '../data/cvData';
import { useApp } from '../context/AppContext';

const SkillsGraph2D = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const { theme } = useApp();
  
  // WebGL and Offscreen buffers
  const glState = useRef({
    gl: null,
    program: null,
    texture: null,
    buffer: null,
    offscreenCanvas: null,
    offscreenCtx: null,
  });

  const getThemeColors = () => {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return {
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      text: isDark ? '#f4f4f5' : '#18181b',
      bg: isDark ? '#09090b' : '#ffffff',
      primary: isDark ? '#f4f4f5' : '#18181b',
      accent: isDark ? '#3b82f6' : '#2563eb',
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Data Preparation ---
    const buildTree = () => {
      const root = { name: 'Skills', children: [] };
      const categories = {};
      
      cvData.skills.forEach(skill => {
        if (!categories[skill.category]) {
          categories[skill.category] = { name: skill.category, children: [] };
          root.children.push(categories[skill.category]);
        }
        categories[skill.category].children.push({ name: skill.name });
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
        const current = { node, depth, x: 0, y: depth * nodeSizeY, parent: null };
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

    const layout = layoutTree(treeData, { nodeWidth: 160, nodeHeight: 60, paddingX: 40 });

    const canvas = canvasRef.current;
    
    // --- WebGL Initialization ---
    const initWebGL = () => {
      const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
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
        uniform float uTime;

        float random(vec2 uv) {
          return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Optical-style falloff (vignette)
          float blurAmount = smoothstep(0.12, 0.55, dist) * uRadius;
          
          if (blurAmount < 0.2) {
            gl_FragColor = texture2D(uTexture, vUv);
            return;
          }

          vec4 color = vec4(0.0);
          float total = 0.0;
          
          // Poisson Disk-style sampling for true optical Gaussian feel
          const int SAMPLES = 40;
          float goldenAngle = 2.39996; // Golden angle in radians
          
          for (int i = 0; i < SAMPLES; i++) {
            float r = sqrt(float(i) / float(SAMPLES)) * blurAmount;
            float theta = float(i) * goldenAngle + random(vUv) * 6.28;
            vec2 offset = vec2(cos(theta), sin(theta)) * r / uResolution;
            
            // Dynamic Chromatic Aberration linked to energy and blur amount
            float aberration = 1.0 + (uEnergy * 0.15 * (blurAmount / uRadius));
            
            vec4 s;
            s.r = texture2D(uTexture, vUv + offset * aberration).r;
            s.g = texture2D(uTexture, vUv + offset).g;
            s.b = texture2D(uTexture, vUv + offset / aberration).b;
            s.a = 1.0;

            color += s;
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
      }

      if (glState.current.gl) {
        glState.current.gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const baseFont = '12px Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';
    ctx.font = baseFont;

    const measureLabelWidth = (label) => {
      const padding = 24;
      const w = Math.ceil(ctx.measureText(label).width);
      return Math.max(80, Math.min(200, w + padding));
    };

    const rootFixed = { x: width / 2, y: height / 2 };
    const nodes_sim = layout.nodes.map(n => {
      const isRoot = n.depth === 0;
      const label = isRoot ? n.node.name.toUpperCase() : n.node.name;
      const w = measureLabelWidth(label);
      return {
        name: label,
        depth: n.depth,
        isRoot,
        x: rootFixed.x + (Math.random() - 0.5) * 50,
        y: rootFixed.y + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        width: w,
        height: isRoot ? 36 : 32,
        fx: isRoot ? rootFixed.x : null,
        fy: isRoot ? rootFixed.y : null,
        color: n.depth === 1 ? '#3b82f6' : (n.depth === 2 ? '#10b981' : null)
      };
    });

    const links_sim = layout.links.map(l => ({
      source: nodes_sim[layout.nodes.indexOf(l.source)],
      target: nodes_sim[layout.nodes.indexOf(l.target)],
      rest: 180 + l.source.depth * 50
    }));

    // --- Physics ---
    const springK = 0.08;
    const damping = 0.20;
    const charge = 4500;
    const centerK = 0.02;
    const maxVelocity = 6.0;
    const domRepelK = 300;
    const edgeRepelK = 1000;
    const edgeMargin = 50;

    const view = { x: 0, y: 0, scale: 1, vx: 0, vy: 0, vs: 0 };
    const viewSpringK = 0.006;
    const viewDamping = 0.90;

    // --- Interaction ---
    let dragging = null;
    let repelPoints = [];

    const updateRepelPoints = () => {
      // Find leaf elements with text content
      const elements = document.querySelectorAll('.repel-target');
      const points = [];
      
      elements.forEach(root => {
        // Deep search for leaf elements with text
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
          acceptNode: (node) => {
            // Only accept elements that have text and no element children
            if (node.children.length === 0 && node.textContent.trim().length > 0) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        });

        let node;
        while (node = walker.nextNode()) {
          const rect = node.getBoundingClientRect();
          if (rect.bottom > -100 && rect.top < window.innerHeight + 100) {
            points.push({
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              w: rect.width,
              h: rect.height
            });
          }
        }
      });
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
      if (n && !n.isRoot) {
        dragging = n;
        n.fx = p.x; n.fy = p.y;
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      }
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const p = toWorld(getPointer(e));
      dragging.fx = p.x; dragging.fy = p.y;
    };
    const onPointerUp = (e) => {
      if (dragging) {
        dragging.fx = null; dragging.fy = null;
        dragging = null;
        if (canvas.releasePointerCapture) canvas.releasePointerCapture(e.pointerId);
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
    let lastRepelUpdate = 0;
    const animate = () => {
      // Periodic update of DOM repel points to avoid expensive queries every frame
      const now = performance.now();
      if (now - lastRepelUpdate > 100) {
        updateRepelPoints();
        lastRepelUpdate = now;
      }

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
        
        // Node-Node Repulsion
        for (let j = i + 1; j < nodes_sim.length; j++) {
          const b = nodes_sim[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = Math.max(36, dx*dx + dy*dy);
          
          // Reduce repulsion for the root (mother) node to prevent it from clearing the whole screen
          let currentCharge = charge;
          if (a.isRoot || b.isRoot) currentCharge = charge * 0.3;
          
          const force = currentCharge / dist2;
          const dist = Math.sqrt(dist2);
          const fx = force * (dx / dist);
          const fy = force * (dy / dist);
          a.ax -= fx; a.ay -= fy;
          b.ax += fx; b.ay += fy;
        }

        // DOM Element Repulsion
        repelPoints.forEach(p => {
          // Convert DOM screen space to simulation world space
          const px = (p.x - view.x) / view.scale;
          const py = (p.y - view.y) / view.scale;
          const pw = p.w / view.scale;
          const ph = p.h / view.scale;

          const dx = a.x - px;
          const dy = a.y - py;
          const dist = Math.hypot(dx, dy) || 1;
          
          // Basic repulsion if inside or near the element's box
          const minDist = Math.max(pw, ph) / 2 + 40;
          if (dist < minDist) {
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

      const cx = width / 2, cy = height / 2;
      nodes_sim.forEach((n, i) => {
        n.ax += (cx - n.x) * centerK;
        n.ay += (cy - n.y) * centerK;
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
      const worldW = maxX - minX || 100;
      const worldH = maxY - minY || 100;
      const targetScale = Math.max(0.6, Math.min(1.5, Math.min((width - margin*2) / worldW, (height - margin*2) / worldH)));
      const targetX = width / 2 - targetScale * (minX + maxX) / 2;
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
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);
      
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);

      // Links
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1 / view.scale;
      links_sim.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(l.source.x, l.source.y);
        ctx.lineTo(l.target.x, l.target.y);
        ctx.stroke();
      });

      // Nodes
      nodes_sim.forEach(n => {
        const x = n.x - n.width/2;
        const y = n.y - n.height/2;
        
        ctx.fillStyle = colors.bg;
        ctx.strokeStyle = n.color || colors.border;
        ctx.lineWidth = (n.isRoot ? 2 : 1.5) / view.scale;
        
        roundRect(ctx, x, y, n.width, n.height, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = colors.text;
        ctx.font = n.isRoot ? `bold 14px Inter` : `${12}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.name, n.x, n.y);
      });
      ctx.restore();

      // --- WebGL Post-Processing ---
      if (glState.current.gl) {
        const { gl, program, texture, buffer, offscreenCanvas } = glState.current;
        
        gl.useProgram(program);
        
        // Upload 2D canvas to texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);
        
        // Set uniforms
        const resLoc = gl.getUniformLocation(program, 'uResolution');
        gl.uniform2f(resLoc, offscreenCanvas.width, offscreenCanvas.height);
        
        const radLoc = gl.getUniformLocation(program, 'uRadius');
        // Pulse radius slightly with energy (reduced by factor of 2)
        gl.uniform1f(radLoc, (30.0 + energy * 40.0) * dpr); 
        
        const energyLoc = gl.getUniformLocation(program, 'uEnergy');
        gl.uniform1f(energyLoc, energy);
        
        const timeLoc = gl.getUniformLocation(program, 'uTime');
        gl.uniform1f(timeLoc, performance.now() / 1000.0);
        
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
      cancelAnimationFrame(raf);
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full -z-10 bg-white dark:bg-zinc-950 overflow-hidden pointer-events-auto">
      <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
    </div>
  );
};

export default SkillsGraph2D;
