"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, Eye, Zap, Search } from "lucide-react";
import { useEffect, useState } from "react";

// Simulated transactions for the live feed
const mockTransactions = [
  { email: "alice@example.com", amount: 42.0, time: "2 min ago", score: 8 },
  { email: "bob@company.co", amount: 129.5, time: "5 min ago", score: 6 },
  { email: "sarah.j@gmail.com", amount: 24.9, time: "12 min ago", score: 4 },
];

function LiveFeed() {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-md border-white/10 bg-zinc-900/80 backdrop-blur-xl">
      <CardContent className="p-0">
        {/* Search bar */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/50 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Search transactions...</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Live Feed</h3>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full transition-all ${
                isBlinking ? "bg-emerald-300 shadow-lg shadow-emerald-500/50" : "bg-emerald-500"
              }`}
            />
            <span className="text-xs text-zinc-400">Monitoring</span>
          </div>
        </div>

        {/* Waiting message */}
        <div className="border-b border-white/5 px-4 py-3">
          <p className="text-xs text-zinc-500">Waiting for transaction...</p>
        </div>

        {/* Transactions */}
        <div className="divide-y divide-white/5">
          {mockTransactions.map((tx, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-medium text-white">{tx.email}</p>
                <p className="text-xs text-zinc-500">
                  €{tx.amount.toFixed(2)} • {tx.time}
                </p>
              </div>
              <div className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-400">
                {tx.score}/100
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-purple-500/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <div className="pt-4">
            {/* Badge */}
            <Badge
              variant="outline"
              className="mb-6 border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-indigo-300"
            >
              Beta coming soon
            </Badge>

            {/* Headline */}
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
              Stop card testing.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Understand why.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mb-8 max-w-lg text-lg text-zinc-400">
              Detect and block card testing attacks with visual explanations. See
              exactly why each transaction was flagged. Setup in 5 minutes.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-white px-6 text-black hover:bg-zinc-200"
                >
                  Start for free
                </Button>
              </Link>
              <Link href="#features">
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-zinc-300 hover:bg-white/5 hover:text-white"
                >
                  Explore features
                </Button>
              </Link>
            </div>

            {/* Feature badges */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span>Card Testing Detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Eye className="h-4 w-4 text-indigo-400" />
                <span>Visual Explanations</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Zap className="h-4 w-4 text-indigo-400" />
                <span>Auto-Actions</span>
              </div>
            </div>
          </div>

          {/* Right: Live Feed Preview */}
          <div className="flex justify-center lg:justify-end">
            <LiveFeed />
          </div>
        </div>

        {/* Bottom trust bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-8 text-sm text-zinc-500 md:gap-10">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>5-minute Stripe OAuth setup</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Clear explanations for every block</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span>Start FREE • Scale from €99/month</span>
          </div>
        </div>
      </div>
    </section>
  );
}
