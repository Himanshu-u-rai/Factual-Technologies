import type { Metadata } from "next";
import { Sulphur_Point, Poppins, Spline_Sans, Alexandria } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/layout/BackToTop";

const sulphurPoint = Sulphur_Point({
  variable: "--font-sulphur-point",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const splineSans = Spline_Sans({
  variable: "--font-spline-sans",
  subsets: ["latin"],
  display: "swap",
});

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Factual Technologies — Production Software, Cloud & AI Engineering",
  description:
    "Senior software, cloud, and AI engineers working alongside your team to design, build, and deploy production systems.",
  keywords: [
    "AI Engineering",
    "Cloud Architecture",
    "Digital Product Engineering",
    "Enterprise Software",
    "Factual Technologies",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${sulphurPoint.variable} ${splineSans.variable} ${alexandria.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 selection:bg-slate-200 selection:text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
        <BackToTop />
      </body>
    </html>
  );
}
