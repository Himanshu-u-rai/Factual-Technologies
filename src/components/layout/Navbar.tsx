'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/lib/data";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { AnimatedBackground } from "@/components/motion-primitives";
import { useSiteContent } from "@/lib/site-store";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { content } = useSiteContent();
  const meta = content.meta;
  const activeNavLinks = meta?.navLinks && meta.navLinks.length > 0 ? meta.navLinks : navLinks;

  // Scroll listener with useEffect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on pathname change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-2 sm:pt-3 px-4 sm:px-6">
      <div className="relative max-w-6xl mx-auto space-y-2">
        {/* Top Announcement Bar if enabled in Admin */}
        {meta?.announcementEnabled && (
          <div className="mx-auto flex items-center justify-center">
            <Link
              href={meta.announcementLink || "/services"}
              className="inline-flex items-center px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              <span>{meta.announcementText || "Architecture audit slots open for Q4 scheduling"}</span>
            </Link>
          </div>
        )}

        {/* Floating Pill Container */}
        <nav
          aria-label="Main Navigation"
          className={`rounded-full transition-all duration-200 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between border ${
            scrolled
              ? "backdrop-blur-md bg-white/90 border-slate-200/90 shadow-sm shadow-slate-900/5"
              : "backdrop-blur-xs bg-white/80 border-slate-200/60"
          }`}
        >
          {/* Left: Brand Logo */}
          <Link
            href="/"
            className="group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 rounded-full"
            aria-label="Factual Technologies Home"
          >
            <Logo size="md" variant="light" />
          </Link>

          {/* Center (desktop): Nav links with AnimatedBackground */}
          <div className="hidden md:flex items-center">
            <AnimatedBackground
              defaultValue={pathname}
              className="rounded-full bg-slate-100"
              transition={{
                type: "spring",
                bounce: 0.15,
                duration: 0.3,
              }}
              enableHover
            >
              {activeNavLinks.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    data-id={link.href}
                    href={link.href}
                    className={`relative text-sm font-medium transition-colors px-3.5 py-1.5 rounded-full z-10 ${
                      isActive
                        ? "text-slate-950 font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </AnimatedBackground>
          </div>

          {/* Right: CTA & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <Button href="/contact" variant="primary" size="sm">
                Book a call
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 rounded-full"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-2 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-1">
              {activeNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`min-h-[44px] flex items-center px-4 rounded-xl text-base font-medium transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-950 font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <div className="pt-3 border-t border-slate-100 mt-2">
                <Button
                  href="/contact"
                  variant="primary"
                  size="md"
                  className="w-full justify-center"
                >
                  Book a call
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;

