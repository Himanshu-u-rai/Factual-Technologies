'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Linkedin, Twitter, Github } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useSiteContent } from "@/lib/site-store";

export default function Footer() {
  const pathname = usePathname();
  const { content } = useSiteContent();
  const meta = content.meta;

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const socialLinks = [
    {
      name: "LinkedIn",
      href: meta?.socialLinkedIn || "https://linkedin.com",
      icon: Linkedin,
    },
    {
      name: "Twitter",
      href: meta?.socialTwitter || "https://twitter.com",
      icon: Twitter,
    },
    {
      name: "GitHub",
      href: meta?.socialGitHub || "https://github.com",
      icon: Github,
    },
  ];

  const pageLinks = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Work", href: "/work" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const capabilityLinks = [
    { label: "Digital Product Engineering", href: "/services" },
    { label: "AI Systems & Automation", href: "/services" },
    { label: "Cloud Infrastructure & Data", href: "/services" },
  ];

  const activePageLinks = meta?.navLinks && meta.navLinks.length > 0 ? meta.navLinks : pageLinks;
  const activeCapabilityLinks =
    meta?.footerCapabilityLinks && meta.footerCapabilityLinks.length > 0
      ? meta.footerCapabilityLinks
      : capabilityLinks;

  return (
    <footer className="w-full bg-slate-950 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Column 1: Brand Info */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="inline-block group">
              <Logo size="lg" variant="dark" />
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {meta?.description ||
                "Senior engineers building reliable web software, cloud infrastructure, and internal AI tools."}
            </p>

            <div className="flex items-center gap-2 pt-2">
              {socialLinks.map(({ name, href, icon: Icon }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className="min-w-[44px] min-h-[44px] rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-2.5">
              {activePageLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Capabilities */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Capabilities
            </h3>
            <ul className="space-y-2.5">
              {activeCapabilityLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="lg:col-span-3 space-y-3 min-w-0">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Office
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {meta?.address || "Howard Street, SoMa, San Francisco"}
            </p>
            <p className="text-sm text-slate-400 pt-1">
              <a
                href={`mailto:${meta?.email || "hello@factualtechnologies.example"}`}
                className="hover:text-white transition-colors break-words inline-block max-w-full"
              >
                {meta?.email || "hello@factualtechnologies.example"}
              </a>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{meta?.copyright || "© 2026 Factual Technologies Inc. All rights reserved."}</p>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="hover:text-slate-300 transition-colors">
              Contact
            </Link>
            <Link href="/work" className="hover:text-slate-300 transition-colors">
              Case Studies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
