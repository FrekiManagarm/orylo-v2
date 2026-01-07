import Link from "next/link";
import { Shield } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const footerLinks = {
  product: {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/blog" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/cgu" },
      { label: "Cookie Policy", href: "/privacy" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600">
                <HugeiconsIcon icon={Shield} className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Orylo</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-zinc-400">
              AI-powered fraud detection for Stripe. Protect your business and
              save on chargebacks.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="mb-4 text-sm font-semibold text-white">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Orylo Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
