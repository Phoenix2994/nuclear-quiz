import { useEffect, useRef } from 'react';

/** Forma d'onda animata, come quella di una canzone alla radio: inviluppo che pulsa a ritmo, armoniche che scorrono e un po' di fruscio. */
export function RadioWave() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const color = getComputedStyle(canvas).getPropertyValue('--fg').trim() || '#4dff6a';
    const dim = getComputedStyle(canvas).getPropertyValue('--line').trim() || '#1f6b2a';
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (ms: number) => {
      const t = ms / 2200;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= w; gx += 24) {
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, h);
      }
      ctx.moveTo(0, h / 2 + 0.5);
      ctx.lineTo(w, h / 2 + 0.5);
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // colpo di batteria: l'ampiezza sale di scatto e decade, ~2 battiti al secondo
      const beat = Math.pow(Math.abs(Math.sin(t * Math.PI * 2.1)), 3);
      const phrase = 0.7 + 0.3 * Math.sin(t * 0.7);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const mid = h / 2;
      for (let x = 0; x <= w; x += 2) {
        const p = x / w;
        const edge = Math.sin(Math.PI * p); // si spegne ai bordi
        const env = (0.28 + 0.72 * Math.abs(Math.sin(x * 0.021 - t * 3.3))) * (0.6 + 0.4 * beat) * phrase;
        const v =
          Math.sin(x * 0.09 + t * 11) * 0.5 +
          Math.sin(x * 0.23 - t * 17) * 0.28 +
          Math.sin(x * 0.51 + t * 29) * 0.14 +
          (Math.random() - 0.5) * 0.16;
        const y = mid + v * env * edge * (h * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (!still) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="radio-wave" aria-hidden="true" />;
}
