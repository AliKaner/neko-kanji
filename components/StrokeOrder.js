"use client";

import { useEffect, useRef, useState } from "react";

// KanjiVG verisiyle animasyonlu çizgi sırası gösterimi.
// Soluk gri: hedef şekil; kırmızı: çizilmiş çizgiler; altın: o an çizilen çizgi.
export default function StrokeOrder({ char, size = 190 }) {
  const [paths, setPaths] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [drawn, setDrawn] = useState(0); // tamamlanan çizgi sayısı
  const [anim, setAnim] = useState(-1); // o an animasyonu süren çizgi
  const [playing, setPlaying] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const pathRefs = useRef([]);
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setPaths(null);
    setPlaying(false);
    setAnim(-1);
    clearTimeout(timer.current);
    pathRefs.current = [];

    fetch(`/api/strokes?c=${encodeURIComponent(char)}`)
      .then((r) => {
        if (!r.ok) throw new Error("yok");
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const ps = [
          ...doc.querySelectorAll('g[id^="kvg:StrokePaths"] path'),
        ].map((p) => p.getAttribute("d"));
        const ns = [
          ...doc.querySelectorAll('g[id^="kvg:StrokeNumbers"] text'),
        ].map((t) => {
          const m = /matrix\((?:[-\d.]+[ ,]+){4}([-\d.]+)[ ,]+([-\d.]+)\)/.exec(
            t.getAttribute("transform") || ""
          );
          return m ? { x: +m[1], y: +m[2] } : null;
        });
        if (!ps.length) throw new Error("boş");
        setPaths(ps);
        setNumbers(ns);
        setDrawn(ps.length); // başlangıçta karakter tam çizili görünsün
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [char]);

  // Veri geldikten sonra tüm çizgileri "çizilmiş" duruma getir
  useEffect(() => {
    if (status !== "ready") return;
    requestAnimationFrame(() => {
      pathRefs.current.forEach((el) => {
        if (!el) return;
        const len = el.getTotalLength();
        el.style.transition = "none";
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = "0";
      });
    });
  }, [status, paths]);

  // İlk n çizgi görünür olacak şekilde anında ayarla
  const setUpTo = (n) => {
    clearTimeout(timer.current);
    setPlaying(false);
    setAnim(-1);
    pathRefs.current.forEach((el, i) => {
      if (!el) return;
      const len = el.getTotalLength();
      el.style.transition = "none";
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = i < n ? "0" : `${len}`;
    });
    setDrawn(n);
  };

  const animateFrom = (i) => {
    if (!paths || i >= paths.length) {
      setPlaying(false);
      setAnim(-1);
      return;
    }
    const el = pathRefs.current[i];
    if (!el) {
      setPlaying(false);
      return;
    }
    setAnim(i);
    const len = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    el.getBoundingClientRect(); // stili uygula (reflow)
    const dur = Math.max(350, len * 14);
    el.style.transition = `stroke-dashoffset ${dur}ms ease-in-out`;
    el.style.strokeDashoffset = "0";
    timer.current = setTimeout(() => {
      setDrawn(i + 1);
      timer.current = setTimeout(() => animateFrom(i + 1), 130);
    }, dur);
  };

  const play = () => {
    setUpTo(0);
    setPlaying(true);
    requestAnimationFrame(() => animateFrom(0));
  };

  if (status === "error") {
    return (
      <div className="stroke-item">
        <p className="hint">
          「<span className="jp">{char}</span>」 için çizgi sırası verisi
          bulunamadı (internet bağlantısı gerekli).
        </p>
      </div>
    );
  }

  return (
    <div className="stroke-item">
      <svg viewBox="0 0 109 109" width={size} height={size}>
        <line x1="54.5" y1="2" x2="54.5" y2="107" className="guide" />
        <line x1="2" y1="54.5" x2="107" y2="54.5" className="guide" />
        {paths && (
          <>
            <g className="ghost-strokes">
              {paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g className="main-strokes">
              {paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  ref={(el) => (pathRefs.current[i] = el)}
                  className={anim === i ? "animating" : ""}
                />
              ))}
            </g>
            {showNumbers && (
              <g className="stroke-numbers">
                {numbers.map((n, i) =>
                  n && (i < drawn || i === anim) ? (
                    <text key={i} x={n.x} y={n.y}>
                      {i + 1}
                    </text>
                  ) : null
                )}
              </g>
            )}
          </>
        )}
      </svg>
      <div className="stroke-controls">
        <button
          className="btn small"
          onClick={play}
          disabled={status !== "ready" || playing}
          title="Çizgi sırasını baştan izle"
        >
          ▶ İzle
        </button>
        <button
          className="btn secondary small"
          onClick={() => setUpTo(Math.max(0, drawn - 1))}
          disabled={status !== "ready" || drawn === 0}
          title="Bir çizgi geri"
        >
          ⏮
        </button>
        <button
          className="btn secondary small"
          onClick={() => setUpTo(Math.min(paths?.length || 0, drawn + 1))}
          disabled={status !== "ready" || !paths || drawn >= paths.length}
          title="Bir çizgi ileri"
        >
          ⏭
        </button>
        <button
          className={`btn small ${showNumbers ? "" : "secondary"}`}
          onClick={() => setShowNumbers((s) => !s)}
          title="Çizgi numaralarını göster/gizle"
        >
          🔢
        </button>
      </div>
      {paths && (
        <div className="hint" style={{ marginTop: 4 }}>
          {drawn}/{paths.length} çizgi
        </div>
      )}
    </div>
  );
}
