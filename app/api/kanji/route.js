import kanjiData from "@/app/kanji-top-2500.json";
import { KANJI } from "@/lib/data";

// JSON tam bir kanji sözlüğü (~13k entry) içerir; frekans verisi olan 2501
// tanesi "top 2500" setidir. Liste/rastgele/quiz yalnızca bu seti kullanır —
// frekanssız girdilerin çoğunda anlam/okunuş eksiktir. Tekil ?c= sorgusu ise
// (modal detayları için) tüm sözlükten bakabilir.
let kanjiArray = []; // sadece frekanslı top 2501
const kanjiByChar = new Map(); // tüm sözlük
for (const [char, info] of Object.entries(kanjiData)) {
  const n5 = KANJI.find((k) => k.c === char);
  const item = {
    c: char,
    rank: info.freq || info.rank || 9999,
    meanings: info.meanings || [],
    on: info.readings_on || [],
    kun: info.readings_kun || [],
    strokes: info.strokes || 0,
    jlpt: info.jlpt_new || 0,
    grade: info.grade || 0,
    m: n5 ? n5.m : (info.meanings ? info.meanings.join(", ") : ""),
    m_tr: n5 ? n5.m : null,
    ex: n5 ? n5.ex : null,
  };
  kanjiByChar.set(char, item);
  if (info.freq) kanjiArray.push(item);
}
// Sort by frequency rank ascending
kanjiArray.sort((a, b) => a.rank - b.rank);

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // 1. Single lookup by character (tüm sözlükten)
  const char = searchParams.get("c");
  if (char) {
    const item = kanjiByChar.get(char);
    if (!item) {
      return Response.json({ error: "Kanji bulunamadı" }, { status: 404 });
    }
    return Response.json(item);
  }

  // 2. Random kanji lookup
  if (searchParams.get("random") === "true") {
    const jlpt = searchParams.get("jlpt");
    let pool = kanjiArray;
    if (jlpt && jlpt !== "all") {
      pool = pool.filter((k) => k.jlpt === parseInt(jlpt));
    }
    if (pool.length === 0) {
      return Response.json({ error: "Karakter havuzu boş" }, { status: 404 });
    }
    const randItem = pool[Math.floor(Math.random() * pool.length)];
    return Response.json(randItem);
  }

  // 3. Quiz question generator (correct + 3 distractors)
  if (searchParams.get("quiz") === "true") {
    const jlpt = searchParams.get("jlpt");
    const lang = searchParams.get("lang") || "tr";

    let pool = kanjiArray;
    if (jlpt && jlpt !== "all") {
      pool = pool.filter((k) => k.jlpt === parseInt(jlpt));
    }
    if (pool.length === 0) {
      return Response.json({ error: "Karakter havuzu boş" }, { status: 404 });
    }

    const correctItem = pool[Math.floor(Math.random() * pool.length)];

    let correctVal = "";
    if (lang === "tr" && correctItem.m_tr) {
      correctVal = correctItem.m_tr;
    } else {
      correctVal = correctItem.meanings[0] || correctItem.m || "";
    }

    const options = new Set([correctVal]);
    let guard = 0;
    while (options.size < 4 && guard++ < 200) {
      const otherItem = pool[Math.floor(Math.random() * pool.length)];
      let otherVal = "";
      if (lang === "tr" && otherItem.m_tr) {
        otherVal = otherItem.m_tr;
      } else {
        otherVal = otherItem.meanings[0] || otherItem.m || "";
      }
      if (otherVal && otherVal !== correctVal) {
        options.add(otherVal);
      }
    }

    if (options.size < 4) {
      const generalFallbacks =
        lang === "tr"
          ? ["su", "dağ", "ağaç", "nehir", "ateş"]
          : ["water", "mountain", "tree", "river", "fire"];
      for (const fallback of generalFallbacks) {
        if (fallback !== correctVal) options.add(fallback);
        if (options.size === 4) break;
      }
    }

    const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

    return Response.json({
      item: {
        type: "kanji",
        ...correctItem,
      },
      correct: correctVal,
      options: shuffledOptions,
    });
  }

  // 4. Default: Paginated list & Search
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "100");
  const search = searchParams.get("search") || "";
  const jlpt = searchParams.get("jlpt") || "";

  let pool = kanjiArray;
  if (jlpt && jlpt !== "all") {
    pool = pool.filter((k) => k.jlpt === parseInt(jlpt));
  }

  if (search) {
    const s = search.toLowerCase().trim();
    pool = pool.filter(
      (k) =>
        k.c === s ||
        k.meanings.some((m) => m.toLowerCase().includes(s)) ||
        (k.m_tr && k.m_tr.toLowerCase().includes(s))
    );
  }

  const total = pool.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = pool.slice(startIndex, endIndex);

  return Response.json({
    kanjis: paginated,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
