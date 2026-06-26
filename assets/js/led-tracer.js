// L E D   B O R D E R   T R A C E R
// Aesthetic reference: ~/Documents/code/Arduino/case-tracer (case-tracer.ino),
// a WS2812B animator. We borrow ONLY the "sprite" idea — a bright head dragging
// a short trail that fades logarithmically, drawn with additive blending (the
// sketch's `leds[idx] +=`, here canvas 'lighter') so overlapping trails mix.
//
// Behavior: a single sprite with a long tail that cycles through the palette in
// order (yellow → red → green → blue, head to tail-end). Starting at a random
// point on the edge, it laps the card border once, then the head drives off and
// the tail drains away behind it. A one-shot flourish, not a perpetual loop.
(function () {
  'use strict';

  const Site = window.Site;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tail gradient, head → end: yellow → red → green → blue. Site palette;
  // green is Tailwind green-400 (#4ade80) to match the resume "↓ PDF" button.
  const COLORS = [
    [253, 224, 71],  // yellow #FDE047 (head)
    [239, 68,  68],  // red    #EF4444
    [74,  222, 128], // green  #4ADE80
    [59,  130, 246], // blue   #3B82F6 (tail end)
  ];
  const TRAIL_LEN = 120;  // LEDs in the tail (longer count keeps the tail length now that LEDs are finer)
  const LED       = 2;    // size of one "LED" square, in CSS px (also the sample spacing)
  const INSET     = 4;    // centers the strip in the card's transparent lane (p-2 = 8px)
  const RADIUS    = 16;   // matches the lane's Tailwind rounded-2xl (1rem)
  const LAPS      = 1;    // full loops around the border at boot
  const LAP_MS    = 2667; // time for one lap (a further 25% slower)
  const EXIT_MS   = 800;  // tail drain (head-first) after the final lap
  const SVGNS     = 'http://www.w3.org/2000/svg';

  function tailAlpha(t) {
    // brightest at the head, soft taper to the tip — keeps every color visible
    return Math.sqrt(1 - t / TRAIL_LEN);
  }

  // Color at tail position t: lerp across COLORS evenly from head to tip.
  // Treats COLORS as evenly spaced gradient stops and returns the blended RGB
  // for any point between them. t = 0 is the head, t = TRAIL_LEN-1 is the tip.
  function tailColor(t) {
    // Number of gaps between stops (4 colors → 3 segments to interpolate across).
    const segs = COLORS.length - 1;
    // Map t (0 .. TRAIL_LEN-1) onto a continuous color position (0 .. segs).
    // e.g. with segs=3: head→0.0, tip→3.0, middle of the tail→~1.5.
    const cp = (t / (TRAIL_LEN - 1)) * segs;
    // The stop just below cp (the segment's start color). min() clamps the tip.
    const i0 = Math.min(segs, Math.floor(cp));
    // The stop just above (the segment's end color), also clamped to the last stop.
    const i1 = Math.min(segs, i0 + 1);
    // How far we are between i0 and i1: 0.0 = exactly i0, ~1.0 = almost i1.
    const f = cp - i0;
    // a = start color, b = end color of this segment.
    const a = COLORS[i0], b = COLORS[i1];
    // Linear interpolation per channel: a + (b - a) * f, rounded to a whole byte.
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
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
      const count = Math.max(TRAIL_LEN + 8, Math.round(total / LED));
      leds = [];
      for (let i = 0; i < count; i++) {
        const p = probe.getPointAtLength((i / count) * total);
        leds.push({ x: Math.round(p.x), y: Math.round(p.y) });
      }
    }

    // Draw the tail for a given lead position. minT is the front-most tail index
    // still alive — during the exit phase it climbs from 0 → TRAIL_LEN so the
    // head disappears first and the tail drains away behind it.
    function paint(leadPos, minT) {
      const n = leds.length;
      if (!n) return;
      const from = Math.max(0, Math.ceil(minT));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter'; // additive, like the sketch
      // Walk from the tip back toward the head so the bright head paints last.
      for (let t = TRAIL_LEN - 1; t >= from; t--) {
        const idx = ((Math.floor(leadPos - t)) % n + n) % n;
        // Brightness is relative to the front of the *visible* tail, so as it
        // drains the leading edge stays bright — it shortens, it doesn't fade.
        const a = tailAlpha(t - from);
        const [cr, cg, cb] = tailColor(t);
        const px = leds[idx];
        ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
        ctx.shadowBlur = 5 * a;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
        // full LED size (not LED-1) so the squares tile with no black gaps
        ctx.fillRect(px.x - LED / 2, px.y - LED / 2, LED, LED);
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    }

    function clear() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Run the one-shot: start at a random point, LAPS laps at LAP_MS each, then
    // drain the tail (head-first) over EXIT_MS.
    function run() {
      rebuild();
      const n = leds.length;
      if (!n) return;
      const startOffset = Math.random() * n; // begin at a random point on the edge
      if (REDUCED) { paint(startOffset, 0); return; } // static frame, no motion

      const speed = n / LAP_MS;   // LEDs per ms
      const runMs = LAPS * LAP_MS;
      let start = null;

      function frame(now) {
        if (start === null) start = now;
        const e = now - start;
        const leadPos = startOffset + e * speed; // keeps moving while it drains
        if (e <= runMs) {
          paint(leadPos, 0);
          requestAnimationFrame(frame);
        } else if (e <= runMs + EXIT_MS) {
          paint(leadPos, ((e - runMs) / EXIT_MS) * TRAIL_LEN);
          requestAnimationFrame(frame);
        } else {
          clear();
        }
      }
      requestAnimationFrame(frame);
    }

    // Play once, the first time the card scrolls into view.
    Site.onceInView(card, run, { threshold: 0 });

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
