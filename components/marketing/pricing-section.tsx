"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "FREE",
    description: "Perfect for testing",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "1,000 transactions/mo",
      "Card testing detection",
      "Visual explanations",
      "7-day history",
      "Email alerts",
    ],
    cta: "Start Free",
    href: "/sign-up",
    highlighted: false,
  },
  {
    name: "PRO",
    description: "Lock this price forever",
    monthlyPrice: 39,
    originalMonthlyPrice: 79,
    annualPrice: 29,
    originalAnnualPrice: 59,
    badge: "LIMITED TIME",
    features: [
      "Everything in Free",
      "Unlimited transactions",
      "30-day history",
      "3 custom rules",
      "Priority email support",
      "Price locked forever",
    ],
    cta: "Get Started",
    href: "/sign-up",
    highlighted: true,
    savings: "Save 50%",
    savingsNote: "• forever",
    footerNote: "First 100 customers only",
  },
  {
    name: "BUSINESS",
    description: "For power users",
    monthlyPrice: 99,
    annualPrice: 74,
    features: [
      "Everything in Pro",
      "90-day history",
      "Unlimited custom rules",
      "Webhooks + API access",
      "Slack/Discord alerts",
      "Support < 24h",
    ],
    cta: "Get Started",
    href: "/sign-up",
    highlighted: false,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-20 md:py-28">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge className="mb-4 border-orange-500/30 bg-orange-500/10 text-orange-300">
            Limited Time: 50% off for early adopters
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="text-zinc-400">
            Start free. Upgrade when you need more.
            <br />
            First 100 customers lock in 39€/mo forever.
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-12 flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-white/10 bg-zinc-900/50 p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                !isAnnual
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                isAnnual
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Annual
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                Save 25%
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier, index) => {
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
            const originalPrice = isAnnual
              ? tier.originalAnnualPrice
              : tier.originalMonthlyPrice;

            return (
              <Card
                key={index}
                className={`relative overflow-hidden border backdrop-blur-xl ${
                  tier.highlighted
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-zinc-900/50"
                    : "border-white/10 bg-zinc-900/50"
                }`}
              >
                {tier.badge && (
                  <div className="absolute left-4 top-4">
                    <Badge className="bg-orange-500/20 text-orange-300 text-xs">
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                <CardContent className="p-6 pt-12">
                  {/* Plan info */}
                  <div className="mb-6">
                    <h3 className="text-xs font-bold tracking-widest text-zinc-400">
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {tier.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      {originalPrice && (
                        <span className="text-xl text-zinc-500 line-through">
                          €{originalPrice}
                        </span>
                      )}
                      <span className="text-4xl font-bold text-white">
                        €{price}
                      </span>
                      <span className="text-zinc-400">/mo</span>
                    </div>
                    {tier.savings && (
                      <p className="mt-2 text-sm font-medium text-orange-400">
                        {tier.savings}
                        <span className="text-orange-300">{tier.savingsNote}</span>
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="mb-8 space-y-3">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        <span
                          className={`text-sm ${
                            feature.includes("locked") || feature.includes("forever")
                              ? "font-medium text-white"
                              : "text-zinc-300"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href={tier.href} className="block">
                    <Button
                      className={`w-full ${
                        tier.highlighted
                          ? "bg-white text-black hover:bg-zinc-200"
                          : "border border-white/20 bg-transparent text-white hover:bg-white/10"
                      }`}
                    >
                      {tier.cta}
                    </Button>
                  </Link>

                  {tier.footerNote && (
                    <p className="mt-4 text-center text-xs text-zinc-500">
                      {tier.footerNote}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
