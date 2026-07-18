"use client";

import { useEffect, useRef, useState } from "react";
import { kanaToRomaji } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import { wordsStartingWith, wordsContainingKanji } from "@/lib/words";
import StrokeOrder from "@/components/StrokeOrder";

// Genel çizgi kuralları rehberi
function StrokeRules() {
  return (
    <details className="rules">
      <summary>📏 Çizgiler nasıl atılmalı? — Temel kurallar</summary>
      <ol>
        <li><b>Yukarıdan aşağıya:</b> Çizgiler üstten başlar, aşağı iner (<span className="jp">三</span>).</li>
        <li><b>Soldan sağa:</b> Yatay çizgiler soldan başlar (<span className="jp">一</span>).</li>
        <li><b>Önce yatay, sonra dikey:</b> Kesişen çizgilerde yatay önce gelir (<span className="jp">十</span>).</li>
        <li><b>Önce orta, sonra kenarlar:</b> Simetrik karakterlerde ortadaki çizgi önce (<span className="jp">小</span>).</li>
        <li><b>Önce dış çerçeve, sonra içi:</b> Kutu gibi şekillerde dış önce çizilir; ama <b>alt kapatma çizgisi en son</b> (<span className="jp">国</span>).</li>
        <li><b>Sola eğik çizgi, sağa eğikten önce:</b> (<span className="jp">人</span>).</li>
        <li><b>Karakteri delip geçen çizgiler en son:</b> (<span className="jp">中</span>).</li>
      </ol>
      <p className="hint" style={{ marginTop: 8 }}>
        İpucu: Önce ▶ İzle ile sırayı takip et, sonra aşağıdaki alanda kendin çiz.
        Numaralar her çizginin <b>başlangıç noktasını</b> gösterir.
      </p>
    </details>
  );
}

// Yazma pratiği: soluk karakterin üzerinden parmak/fare ile çizme
function TraceBox({ char }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [char]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => (drawing.current = false);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="trace-wrap">
      <div className="trace-title">✍️ Yazma pratiği — soluk karakterin üzerinden çiz:</div>
      <div className="trace-box">
        <div className="trace-ghost jp">{char}</div>
        <canvas
          ref={canvasRef}
          className="trace-canvas"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="trace-actions">
        <button className="btn secondary small" onClick={clear}>
          🧹 Temizle
        </button>
      </div>
    </div>
  );
}

function WordList({ words, title }) {
  if (!words.length) return null;
  return (
    <div className="word-list">
      <div className="trace-title">{title}</div>
      {words.slice(0, 6).map((w) => (
        <div key={w.w + w.kana} className="word-item" onClick={() => speak(w.kana)} title="Dinlemek için tıkla">
          <span className="w jp">{w.w}</span>
          <span className="r jp">{w.kana}</span>
          <span className="romaji">{kanaToRomaji(w.kana)}</span>
          <span className="m">{w.m}</span>
        </div>
      ))}
    </div>
  );
}

export default function CharModal({ item, onClose }) {
  // item: { type: "kana", h, k, r, script } | { type: "kanji", ...KANJI kaydı }
  const [apiInfo, setApiInfo] = useState(null);

  useEffect(() => {
    setApiInfo(null);
    if (item?.type === "kanji") {
      // kanjiapi.dev'den ek bilgi: çizgi sayısı, JLPT, sınıf
      fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(item.c)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setApiInfo)
        .catch(() => {});
    }
  }, [item]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const isKanji = item.type === "kanji";
  const displayChar = isKanji ? item.c : item.script === "katakana" ? item.k : item.h;
  const speakText = isKanji ? (item.kun?.[0] || item.on?.[0] || item.c || "").replace(/\(.*\)/, "") : item.h;
  const words = isKanji
    ? wordsContainingKanji(item.c)
    : wordsStartingWith(item.script === "katakana" ? item.k : item.h);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Kapat">✕</button>
        <div className="modal-head">
          <div className="modal-char jp">{displayChar}</div>
          <div className="modal-info">
            {isKanji ? (
              <>
                <div className="reading-row"><span className="reading-label">ANLAM</span> <b>{item.m}</b></div>
                {item.on && item.on.length > 0 && (
                  <div className="reading-row"><span className="reading-label">ON-YOMİ</span> <span className="jp">{item.on.join("、")}</span> <span className="hint">({item.on.map((r) => kanaToRomaji(r)).join(", ")})</span></div>
                )}
                {item.kun && item.kun.length > 0 && (
                  <div className="reading-row"><span className="reading-label">KUN-YOMİ</span> <span className="jp">{item.kun.join("、")}</span> <span className="hint">({item.kun.map((r) => kanaToRomaji(r.replace(/[()]/g, ""))).join(", ")})</span></div>
                )}
                <div className="reading-row" style={{ marginTop: 6 }}>
                  {(apiInfo?.stroke_count || item.strokes) && (
                    <span className="badge">✏️ {apiInfo?.stroke_count || item.strokes} çizgi</span>
                  )}
                  {(apiInfo?.jlpt || item.jlpt) && (
                    <span className="badge">JLPT N{apiInfo?.jlpt || item.jlpt}</span>
                  )}
                  {(apiInfo?.grade || item.grade) && (
                    <span className="badge">{apiInfo?.grade || item.grade}. sınıf</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="reading-row"><span className="reading-label">OKUNUŞ</span> <b>{item.r}</b></div>
                <div className="reading-row"><span className="reading-label">HİRAGANA</span> <span className="jp">{item.h}</span></div>
                <div className="reading-row"><span className="reading-label">KATAKANA</span> <span className="jp">{item.k}</span></div>
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn small" onClick={() => speak(speakText)}>🔊 Dinle</button>
            </div>
          </div>
        </div>

        <div className="trace-wrap">
          <div className="trace-title">
            🖌️ Çizgi sırası — ▶ İzle ile fırça darbelerini sırayla gör:
          </div>
          <div className="stroke-section">
            {[...displayChar].map((ch) => (
              <StrokeOrder key={ch} char={ch} />
            ))}
          </div>
        </div>

        <StrokeRules />

        <TraceBox char={displayChar} />

        {isKanji && (
          <div className="word-list">
            <div className="trace-title">Örnek kelime:</div>
            <div className="word-item" onClick={() => speak(item.ex.r)} title="Dinlemek için tıkla">
              <span className="w jp">{item.ex.w}</span>
              <span className="r jp">{item.ex.r}</span>
              <span className="romaji">{kanaToRomaji(item.ex.r)}</span>
              <span className="m">{item.ex.m}</span>
            </div>
          </div>
        )}

        <WordList
          words={words}
          title={isKanji ? "Bu kanjiyi içeren kelimeler:" : "Bu harfle başlayan kelimeler:"}
        />
      </div>
    </div>
  );
}
