import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Eye, RefreshCcw } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-20 md:py-28">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/20 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Headline */}
        <h2 className="mb-6 text-3xl font-bold text-white md:text-5xl">
          Stop card testing
          <br />
          <span className="text-zinc-400">attacks today</span>
        </h2>

        {/* Subheadline */}
        <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400">
          Protect your Stripe account from card testing fraud. Visual
          explanations for every blocked transaction. Setup in 5 minutes.
        </p>

        {/* Trust badges */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            <span>Card Testing Detection</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-400" />
            <span>Visual Explanations</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-indigo-400" />
            <span>Auto-Refund & Blacklist</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/sign-up">
            <Button
              size="lg"
              className="w-full bg-white px-8 text-black hover:bg-zinc-200 sm:w-auto"
            >
              Get Started Now
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="ghost"
              className="w-full text-zinc-300 hover:bg-white/5 hover:text-white sm:w-auto"
            >
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
