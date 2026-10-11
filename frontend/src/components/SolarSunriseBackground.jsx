import React, { useEffect, useRef } from 'react';

/**
 * SolarSunriseBackground
 * Full-screen 60 FPS HTML5 Canvas animation featuring the Golden Sunrise Horizon Loop.
 * Renders a cinematic dawn sky, radiant rising sun, volumetric light rays,
 * distant hills, perspective solar panel farm, and floating solar energy motes.
 */
export default function SolarSunriseBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let time = 0;
    let isVisible = true;

    // Handle high-DPI retina displays
    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pause when tab is inactive to save battery/CPU
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Golden solar energy motes (photons)
    const particleCount = 36;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 2 + 1,
        speedY: -(Math.random() * 0.4 + 0.2), // Gently rise
        drift: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.03 + 0.01,
      });
    }

    let lastTimestamp = performance.now();

    // Render loop
    const render = (now) => {
      if (!isVisible) return;

      const delta = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;
      time += delta;

      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      // 1. SKY GRADIENT (Rich golden hour dusk-to-dawn transition)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#090d1a');    // Deep midnight slate
      skyGrad.addColorStop(0.28, '#1e1b4b'); // Deep indigo twilight
      skyGrad.addColorStop(0.48, '#701a75'); // Rich magenta/plum
      skyGrad.addColorStop(0.68, '#c2410c'); // Warm sunrise orange
      skyGrad.addColorStop(0.85, '#f59e0b'); // Radiant amber
      skyGrad.addColorStop(1, '#0b0f19');    // Horizon dark base
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. RISING RADIANT SUN
      const sunBaseY = h * 0.66;
      const sunOscillation = Math.sin(time * 0.3) * 14;
      const sunY = sunBaseY + sunOscillation;
      const sunX = w * 0.5;
      const sunRadius = Math.max(38, Math.min(65, w * 0.04));

      // Atmospheric outer glow
      const outerGlowRadius = Math.max(260, Math.min(520, w * 0.35));
      const outerGlow = ctx.createRadialGradient(sunX, sunY, sunRadius * 0.5, sunX, sunY, outerGlowRadius);
      outerGlow.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
      outerGlow.addColorStop(0.25, 'rgba(251, 146, 60, 0.45)');
      outerGlow.addColorStop(0.55, 'rgba(234, 88, 12, 0.2)');
      outerGlow.addColorStop(0.85, 'rgba(194, 65, 12, 0.08)');
      outerGlow.addColorStop(1, 'rgba(9, 13, 26, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric inner core glow
      const innerGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunRadius * 2);
      innerGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
      innerGlow.addColorStop(0.4, 'rgba(254, 240, 138, 0.95)');
      innerGlow.addColorStop(0.8, 'rgba(245, 158, 11, 0.5)');
      innerGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Sun Core Disc
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. VOLUMETRIC SUN RAYS / LIGHT SHAFTS
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(time * 0.05);
      const rayCount = 14;
      for (let i = 0; i < rayCount; i++) {
        ctx.rotate((Math.PI * 2) / rayCount);
        const rayLength = Math.max(w, h) * 0.9;
        ctx.fillStyle = 'rgba(254, 240, 138, 0.04)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-sunRadius * 0.6, rayLength);
        ctx.lineTo(sunRadius * 0.6, rayLength);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 4. DISTANT MOUNTAIN / HILL SILHOUETTES
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.72);
      ctx.bezierCurveTo(w * 0.2, h * 0.65, w * 0.35, h * 0.71, w * 0.5, h * 0.68);
      ctx.bezierCurveTo(w * 0.68, h * 0.64, w * 0.85, h * 0.73, w, h * 0.69);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Foreground terrain slope
      ctx.fillStyle = '#0a0e1a';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.76);
      ctx.bezierCurveTo(w * 0.3, h * 0.74, w * 0.65, h * 0.78, w, h * 0.74);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // 5. SOLAR FARM PHOTOVOLTAIC ARRAYS ON HORIZON
      const panelCount = Math.max(6, Math.floor(w / 140));
      const spacing = w / panelCount;

      for (let i = 0; i < panelCount; i++) {
        const px = i * spacing + spacing * 0.15;
        const py = h * 0.75 + Math.sin(i * 1.3) * 6;
        const pw = spacing * 0.7;
        const ph = 26;

        // Panel mounting post
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + pw * 0.5, py + ph);
        ctx.lineTo(px + pw * 0.5, py + ph + 12);
        ctx.stroke();

        // Panel glass surface (angled perspective quad)
        const panelGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
        panelGrad.addColorStop(0, '#1e293b');
        panelGrad.addColorStop(0.4, '#0f172a');
        panelGrad.addColorStop(0.7, '#1e3a5f');
        panelGrad.addColorStop(1, '#0369a1');
        ctx.fillStyle = panelGrad;

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)'; // Amber morning highlight
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(px + 4, py);
        ctx.lineTo(px + pw - 4, py);
        ctx.lineTo(px + pw, py + ph);
        ctx.lineTo(px, py + ph);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Silicon cell lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(px + pw * 0.33, py);
        ctx.lineTo(px + pw * 0.33, py + ph);
        ctx.moveTo(px + pw * 0.66, py);
        ctx.lineTo(px + pw * 0.66, py + ph);
        ctx.stroke();

        // Shimmer gleam across panels
        const shimmerOffset = ((time * 0.8 + i * 0.4) % 3) / 3;
        if (shimmerOffset < 1) {
          const sx = px + pw * shimmerOffset;
          ctx.fillStyle = 'rgba(254, 240, 138, 0.2)';
          ctx.beginPath();
          ctx.moveTo(sx, py);
          ctx.lineTo(sx + 8, py);
          ctx.lineTo(sx + 12, py + ph);
          ctx.lineTo(sx + 4, py + ph);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 6. FLOATING SOLAR ENERGY MOTES / PHOTONS (Rising softly)
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(time * 1.5 + p.y * 0.02) * 0.4 + p.drift;

        // Reset particle when it floats off the top
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }

        const dynamicAlpha = p.alpha * (0.6 + Math.sin(time * 3 + p.x) * 0.4);
        ctx.fillStyle = `rgba(254, 240, 138, ${Math.max(0.05, dynamicAlpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden select-none">
      {/* 60 FPS Canvas Canvas Engine */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />

      {/* Ambient Contrast & Vignette Overlays for Maximum Readability */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-950/65 pointer-events-none backdrop-blur-[0.5px]" 
        aria-hidden="true"
      />
      <div 
        className="absolute inset-0 bg-radial-vignette opacity-50 pointer-events-none" 
        aria-hidden="true"
      />
    </div>
  );
}
