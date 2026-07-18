import "./globals.css";
import Nav from "@/components/Nav";
import ConvexClientProvider from "@/components/ConvexClientProvider";

export const metadata = {
  title: "日本語の先生 — Japonca Öğretmenim",
  description:
    "Hiragana, katakana ve kanji öğren; rastgele harf pratiği yap; hover sözlüklü Japonca metinler oku.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        <ConvexClientProvider>
          <Nav />
          <main className="container">{children}</main>
          <footer className="footer">
            がんばって！ — Kolay gelsin! Karakterlere tıklayarak detay, yazma
            pratiği ve sesli okunuş alabilirsin.
          </footer>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
