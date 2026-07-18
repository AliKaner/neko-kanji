import "./globals.css";
import { Nunito, Zen_Maru_Gothic } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { I18nProvider } from "@/lib/i18n";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ui",
});

const zenMaru = Zen_Maru_Gothic({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-jp",
});

export const metadata = {
  title: "猫漢字 Neko Kanji — Japonca Öğren",
  description:
    "Hiragana, katakana ve top 2500 kanji öğren; ilerlemeni haritada izle, arkadaşlarınla ve gruplarla yarış.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={`${nunito.variable} ${zenMaru.variable}`}>
        <ConvexClientProvider>
          <I18nProvider>
            <Nav />
            <main className="container">{children}</main>
            <Footer />
          </I18nProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
