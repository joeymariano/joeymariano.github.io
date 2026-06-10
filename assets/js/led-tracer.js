// L E D   B O R D E R   T R A C E R
// Aesthetic reference: ~/Documents/code/Arduino/case-tracer (case-tracer.ino),
// a WS2812B animator. We borrow ONLY the "sprite" idea — a bright head dragging
// a short trail that fades logarithmically, drawn with additive blending (the
// sketch's `leds[idx] +=`, here canvas 'lighter') so overlapping trails mix.
//
// Behavior: a single train of four sprites — yellow, red, green, blue in order,
// each following the one ahead — laps the card border a few times at boot, then
// fades out. A one-shot flourish, not a perpetual loop.
(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Train order, front to back: yellow → red → green → blue. Site palette;
  // green is Tailwind green-400 (#4ade80) to match the resume "↓ PDF" button.
  const COLORS = [
    [253, 224, 71],  // yellow #FDE047 (leads)
    [239, 68,  68],  // red    #EF4444
    [74,  222, 128], // green  #4ADE80
    [59,  130, 246], // blue   #3B82F6
  ];
  const TRAIL_LEN = 6;    // pixels behind each head
  const SPACING   = 9;    // LED gap between consecutive sprites in the train
  const LED       = 5;    // size of one "LED" square, in CSS px
  const INSET     = 4;    // centers the strip in the card's black lane (p-2 = 8px)
  const RADIUS    = 16;   // matches the lane's Tailwind rounded-2xl (1rem)
  const LAPS      = 4;    // full loops around the border at boot
  const LAP_MS    = 1000; // time for one lap
  const FADE_MS   = 800;  // fade-out after the final lap
  const SVGNS     = 'http://www.w3.org/2000/svg';

  function logFalloff(t) {
    // same curve as the sketch: fast fade near the head, lingering tail
    return 1 - Math.log(t + 1) / Math.log(TRAIL_LEN + 1);
  }

  function setup(card) {
    const canvas = card.querySelector('.led-tracer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Reusable SVG path for sampling the rounded-rect border.
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    const probe = document.createElementNS(SVGNS, 'path');
    svg.appendChild(probe);
    card.appendChild(svg);

    let dpr = 1, leds = [];

    // Walk the rounded-rect perimeter, dropping an LED roughly every LED px.
    function rebuild() {
      const w = card.clientWidth, h = card.clientHeight;
      if (!w || !h) return;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      const r = Math.max(0, Math.min(RADIUS - INSET, w / 2 - INSET, h / 2 - INSET));
      const x = INSET, y = INSET, ww = w - 2 * INSET, hh = h - 2 * INSET;
      probe.setAttribute('d',
        `M ${x + r},${y} H ${x + ww - r} A ${r},${r} 0 0 1 ${x + ww},${y + r} ` +
        `V ${y + hh - r} A ${r},${r} 0 0 1 ${x + ww - r},${y + hh} ` +
        `H ${x + r} A ${r},${r} 0 0 1 ${x},${y + hh - r} ` +
        `V ${y + r} A ${r},${r} 0 0 1 ${x + r},${y} Z`);

      const total = probe.getTotalLength();
      const count = Math.max(SPACING * COLORS.length + TRAIL_LEN, Math.round(total / LED));
      leds = [];
      for (let i = 0; i < count; i++) {
        const p = probe.getPointAtLength((i / count) * total);
        leds.push({ x: Math.round(p.x), y: Math.round(p.y) });
      }
    }

    // Draw the whole train for a given lead position, at a given opacity.
    function paint(leadPos, alpha) {
      const n = leds.length;
      if (!n) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter'; // additive, like the sketch
      for (let s = 0; s < COLORS.length; s++) {
        const head = leadPos - s * SPACING; // each sprite trails the one ahead
        const [cr, cg, cb] = COLORS[s];
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
        for (let t = 0; t < TRAIL_LEN; t++) {
          const idx = ((Math.floor(head - t)) % n + n) % n;
          const a = logFalloff(t);
          const px = leds[idx];
          ctx.shadowBlur = 5 * a;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
          ctx.fillRect(px.x - LED / 2, px.y - LED / 2, LED - 1, LED - 1);
        }
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function clear() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Run the one-shot: LAPS laps at LAP_MS each, then fade over FADE_MS.
    function run() {
      rebuild();
      const n = leds.length;
      if (!n) return;
      if (REDUCED) { paint(0, 1); return; } // static frame, no motion

      const speed = n / LAP_MS;   // LEDs per ms
      const runMs = LAPS * LAP_MS;
      let start = null;

      function frame(now) {
        if (start === null) start = now;
        const e = now - start;
        if (e <= runMs) {
          paint(e * speed, 1);
          requestAnimationFrame(frame);
        } else if (e <= runMs + FADE_MS) {
          paint(runMs * speed, 1 - (e - runMs) / FADE_MS);
          requestAnimationFrame(frame);
        } else {
          clear();
        }
      }
      requestAnimationFrame(frame);
    }

    // Play once, the first time the card scrolls into view.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries, obs) => {
        if (entries[0].isIntersecting) { obs.disconnect(); run(); }
      }, { threshold: 0 });
      io.observe(card);
    } else {
      run();
    }

    // Keep the sampled border in sync if the card resizes before/while running.
    if ('ResizeObserver' in window) {
      let raf = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(rebuild);
      }).observe(card);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.led-tracer').forEach(setup);
  });
})();
