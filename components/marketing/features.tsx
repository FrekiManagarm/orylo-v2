import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Zap, Settings, Clock } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

export function Features() {
  return (
    <section id="features" className="relative py-20 md:py-28">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-2 text-sm font-medium text-zinc-500">
            Simple & Effective
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Stop card testing.
            <br />
            <span className="text-zinc-400">Understand why.</span>
          </h2>
          <p className="text-zinc-400">
            Rule-based detection with visual explanations. See exactly why each
            transaction was blocked.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card Testing Detection */}
          <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                <HugeiconsIcon icon={Shield} className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Card Testing Detection
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Automatically detect and block card testing attacks. Multiple cards
                on same session? Blocked. Fail-fail-fail-success pattern? Blocked.
                Auto-refund fraudulent payments.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-zinc-300"
                >
                  Auto-block
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-zinc-300"
                >
                  Auto-refund
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-zinc-300"
                >
                  Blacklist
                </Badge>
              </div>
              <div className="mt-4">
                <Badge className="bg-red-500/20 text-red-300 text-xs">
                  Real-time detection
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Live in 5 minutes */}
          <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
                <HugeiconsIcon icon={Clock} className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Live in 5 minutes
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                One-click Stripe OAuth connection, zero code. Instantly start
                monitoring all your transactions.
              </p>
              <div className="mt-4 inline-flex items-center rounded-xl bg-indigo-500/10 px-4 py-2">
                <span className="text-2xl font-bold text-indigo-400">5</span>
                <span className="ml-1 text-sm text-indigo-400">
                  min to get started
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Visual Explanations */}
          <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                <HugeiconsIcon icon={Eye} className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Visual Explanations
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Every block is justified with clear, visual reasons. See exactly
                why a transaction was flagged. No more black box decisions.
              </p>
              {/* Example card */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-sm font-medium text-red-400">
                  Card Testing Blocked
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  &quot;3 different cards used • fail-fail-fail-success pattern • 5
                  attempts in 2 minutes&quot;
                </p>
                <p className="mt-2 text-xs font-medium text-zinc-300">
                  Score: 85/100 → Auto-refunded
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Automatic Actions */}
          <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                <HugeiconsIcon icon={Zap} className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Automatic Actions
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Block and auto-refund fraudulent payments. Add IPs to blacklist.
                Send real-time alerts. All without lifting a finger.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-zinc-300"
                >
                  Auto-refund
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-zinc-300"
                >
                  Blacklist
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-zinc-300"
                >
                  Alerts
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Custom Rules */}
          <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                <HugeiconsIcon icon={Settings} className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Custom Rules
              </h3>
              <p className="mb-4 text-sm text-zinc-400">
                Create your own rules: whitelist VIP customers, block specific
                countries, set amount thresholds. Your business, your rules.
              </p>
              <div className="mt-4 inline-flex items-center rounded-xl bg-emerald-500/10 px-4 py-2">
                <span className="text-2xl font-bold text-emerald-400">∞</span>
                <span className="ml-2 text-sm text-emerald-400">flexibility</span>
              </div>
            </CardContent>
          </Card>

          {/* View Pricing CTA */}
          <Card className="flex items-center justify-center border-dashed border-white/20 bg-transparent">
            <CardContent className="p-6 text-center">
              <Link
                href="#pricing"
                className="text-lg font-medium text-zinc-400 transition-colors hover:text-white"
              >
                View pricing →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
