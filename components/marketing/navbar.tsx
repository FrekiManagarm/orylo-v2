"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">Orylo</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            About
          </Link>
          <Link
            href="/blog"
            className="text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Blog
          </Link>
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/sign-in">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              Log in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              size="sm"
              className="bg-white text-black hover:bg-zinc-200"
            >
              Get Started
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-black/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4 px-6 py-6">
            <Link
              href="#features"
              className="text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/blog"
              className="text-zinc-400 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <hr className="border-white/10" />
            <Link href="/sign-in">
              <Button
                variant="ghost"
                className="w-full justify-start text-zinc-300"
              >
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="w-full bg-white text-black hover:bg-zinc-200">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
