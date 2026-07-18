"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STRINGS = {
  tr: {
    "nav.learn": "📖 Harf Öğren",
    "nav.practice": "🎲 Pratik",
    "nav.read": "📜 Okuma",
    "nav.dict": "🔍 Sözlük",
    "nav.kanji": "🗾 Kanji Haritası",
    "nav.friends": "👥 Arkadaşlar",
    "nav.groups": "🏆 Gruplar",
    "nav.account": "👤 Hesabım",
    "nav.login": "👤 Giriş",
    "search.placeholder": "Kullanıcı veya kanji ara…",
    "search.users": "Kullanıcılar",
    "search.kanji": "Kanji",
    "search.none": "Sonuç yok",
    "footer.text":
      "がんばって！ — Kolay gelsin! Karakterlere tıklayarak detay, yazma pratiği ve sesli okunuş alabilirsin.",
    loading: "Yükleniyor...",
    needLogin: "Bu sayfa için giriş yapman gerekiyor →",
    "kanji.title": "🗾 Kanji Haritası",
    "kanji.subtitle":
      "En sık kullanılan {n} kanji, frekans sırasıyla. Bir kanjiyi her doğru bildiğinde karesi renklenir: {t}.",
    thresholds: "1+ mavi · 5+ yeşil · 10+ mor · 20+ altın",
    "level.0": "Öğrenilmedi",
    "level.1": "Mavi",
    "level.2": "Yeşil",
    "level.3": "Mor",
    "level.4": "Altın",
    "stats.learned": "Öğrenilen",
    "stats.next": "Sıradaki kanji",
    "stats.score": "Puan",
    "stats.kanji": "kanji",
    "stats.at": "sırada",
    "kanji.freqRank": "sıklıkta",
    "kanji.timesCorrect": "kez doğru bildin",
    "kanji.levelHint": "Pratikte doğru bildikçe seviye atlar.",
    "kanji.searchDict": "🔍 Sözlükte ara",
    "account.title": "👤 Hesap",
    "account.subtitle":
      "Üye ol; kanji ilerlemen kaydedilsin, arkadaşlarınla ve gruplarla yarış.",
    "account.signIn": "Giriş Yap",
    "account.signUp": "Kayıt Ol",
    "account.name": "Adın (arkadaşların böyle görecek)",
    "account.email": "E-posta",
    "account.password": "Şifre (en az 8 karakter)",
    "account.signInErr": "Giriş başarısız. E-posta veya şifre hatalı.",
    "account.signUpErr":
      "Kayıt başarısız. Şifre en az 8 karakter olmalı; bu e-posta zaten kayıtlı olabilir.",
    "account.signOut": "Çıkış Yap",
    "friends.title": "👥 Arkadaşlar",
    "friends.subtitle":
      "Header'daki aramadan arkadaşlarını bul, profillerinden ekle; kim kaçıncı kanjide gör.",
    "friends.incoming": "📬 Gelen İstekler",
    "friends.outgoing": "📤 Bekleyen İstekler",
    "friends.ranking": "🏅 Sıralama",
    "friends.empty":
      "Henüz arkadaşın yok. Yukarıdaki arama kutusundan isim arat, profiline girip ekle!",
    "friends.accept": "✔ Kabul Et",
    "friends.reject": "✖ Reddet",
    "friends.cancel": "İptal",
    "friends.you": "(sen)",
    "groups.title": "🏆 Gruplar",
    "groups.subtitle":
      "Grup kur, arkadaşlarını davet et; kanji yolculuğunda diğer gruplarla yarışın. Grup puanı = üyelerin kanji puanlarının toplamı.",
    "groups.create": "➕ Grup Kur",
    "groups.join": "🎟 Gruba Katıl",
    "groups.name": "Grup adı",
    "groups.code": "Davet kodu (örn. A3K9ZQ)",
    "groups.createBtn": "Kur",
    "groups.joinBtn": "Katıl",
    "groups.created": "Grup kuruldu! Davet kodu: {code}",
    "groups.joined": '"{name}" grubuna katıldın! 🎉',
    "groups.invite": "Davet kodu:",
    "groups.members": "üye",
    "groups.totalScore": "toplam",
    "groups.leaderboard": "🌍 Gruplar Arası Yarış",
    "groups.none": "Henüz hiç grup yok. İlk grubu sen kur!",
    "groups.leave": "Gruptan Ayrıl",
    "groups.mine": "(senin grubun)",
    "profile.addFriend": "➕ Arkadaş Ekle",
    "profile.requestSent": "İstek gönderildi ⏳",
    "profile.friends": "✔ Arkadaşsınız",
    "profile.remove": "Arkadaşlıktan çıkar",
    "profile.itsYou": "Bu senin profilin 🎉",
    "profile.loginToAdd": "Arkadaş eklemek için giriş yap →",
    "profile.notFound": "Kullanıcı bulunamadı.",
    "profile.map": "Kanji Haritası",
    error: "Bir hata oluştu.",
  },
  en: {
    "nav.learn": "📖 Learn Kana",
    "nav.practice": "🎲 Practice",
    "nav.read": "📜 Reading",
    "nav.dict": "🔍 Dictionary",
    "nav.kanji": "🗾 Kanji Map",
    "nav.friends": "👥 Friends",
    "nav.groups": "🏆 Groups",
    "nav.account": "👤 My Account",
    "nav.login": "👤 Sign In",
    "search.placeholder": "Search users or kanji…",
    "search.users": "Users",
    "search.kanji": "Kanji",
    "search.none": "No results",
    "footer.text":
      "がんばって！ — Good luck! Click any character for details, writing practice and audio.",
    loading: "Loading...",
    needLogin: "You need to sign in for this page →",
    "kanji.title": "🗾 Kanji Map",
    "kanji.subtitle":
      "The {n} most frequent kanji in frequency order. Every time you answer a kanji correctly its square levels up: {t}.",
    thresholds: "1+ blue · 5+ green · 10+ purple · 20+ gold",
    "level.0": "Not learned",
    "level.1": "Blue",
    "level.2": "Green",
    "level.3": "Purple",
    "level.4": "Gold",
    "stats.learned": "Learned",
    "stats.next": "Next kanji",
    "stats.score": "Score",
    "stats.kanji": "kanji",
    "stats.at": "at",
    "kanji.freqRank": "by frequency",
    "kanji.timesCorrect": "correct answers",
    "kanji.levelHint": "Answer correctly in practice to level up.",
    "kanji.searchDict": "🔍 Look up in dictionary",
    "account.title": "👤 Account",
    "account.subtitle":
      "Sign up to save your kanji progress and compete with friends and groups.",
    "account.signIn": "Sign In",
    "account.signUp": "Sign Up",
    "account.name": "Your name (shown to friends)",
    "account.email": "E-mail",
    "account.password": "Password (min 8 characters)",
    "account.signInErr": "Sign in failed. Wrong e-mail or password.",
    "account.signUpErr":
      "Sign up failed. Password must be 8+ characters; this e-mail may already be registered.",
    "account.signOut": "Sign Out",
    "friends.title": "👥 Friends",
    "friends.subtitle":
      "Find friends with the search bar in the header, add them from their profile; see who is at which kanji.",
    "friends.incoming": "📬 Incoming Requests",
    "friends.outgoing": "📤 Pending Requests",
    "friends.ranking": "🏅 Ranking",
    "friends.empty":
      "No friends yet. Search a name in the header search box and add them from their profile!",
    "friends.accept": "✔ Accept",
    "friends.reject": "✖ Reject",
    "friends.cancel": "Cancel",
    "friends.you": "(you)",
    "groups.title": "🏆 Groups",
    "groups.subtitle":
      "Create a group, invite your friends and race other groups on the kanji journey. Group score = sum of member scores.",
    "groups.create": "➕ Create Group",
    "groups.join": "🎟 Join Group",
    "groups.name": "Group name",
    "groups.code": "Invite code (e.g. A3K9ZQ)",
    "groups.createBtn": "Create",
    "groups.joinBtn": "Join",
    "groups.created": "Group created! Invite code: {code}",
    "groups.joined": 'Joined "{name}"! 🎉',
    "groups.invite": "Invite code:",
    "groups.members": "members",
    "groups.totalScore": "total",
    "groups.leaderboard": "🌍 Group Race",
    "groups.none": "No groups yet. Create the first one!",
    "groups.leave": "Leave Group",
    "groups.mine": "(your group)",
    "profile.addFriend": "➕ Add Friend",
    "profile.requestSent": "Request sent ⏳",
    "profile.friends": "✔ You are friends",
    "profile.remove": "Remove friend",
    "profile.itsYou": "This is your profile 🎉",
    "profile.loginToAdd": "Sign in to add friends →",
    "profile.notFound": "User not found.",
    "profile.map": "Kanji Map",
    error: "Something went wrong.",
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState("tr");

  useEffect(() => {
    const saved = window.localStorage.getItem("lang");
    if (saved === "en" || saved === "tr") setLangState(saved);
  }, []);

  const setLang = (l) => {
    setLangState(l);
    window.localStorage.setItem("lang", l);
  };

  const t = (key, vars) => {
    const str = STRINGS[lang][key] ?? STRINGS.tr[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
