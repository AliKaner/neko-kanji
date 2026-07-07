// KanjiVG çizgi sırası SVG verisi için proxy.
// Dosya adı, karakterin 5 haneli küçük-harf hex kod noktasıdır (あ = U+3042 → 03042.svg)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const c = searchParams.get("c");
  if (!c || [...c].length !== 1) {
    return Response.json({ error: "c parametresi tek karakter olmalı" }, { status: 400 });
  }
  const hex = c.codePointAt(0).toString(16).padStart(5, "0");
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`,
      { next: { revalidate: 604800 } }
    );
    if (!res.ok) {
      return Response.json({ error: "Bu karakter için çizgi verisi yok" }, { status: 404 });
    }
    const svg = await res.text();
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Çizgi verisi servisine ulaşılamadı: " + err.message },
      { status: 502 }
    );
  }
}
