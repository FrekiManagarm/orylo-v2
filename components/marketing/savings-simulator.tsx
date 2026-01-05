"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";

export function SavingsSimulator() {
  const [monthlyVolume, setMonthlyVolume] = useState(50000);
  const [fraudRate, setFraudRate] = useState(1.5);
  const [avgOrderValue, setAvgOrderValue] = useState(75);

  const calculations = useMemo(() => {
    // Calculate current losses
    const fraudVolume = monthlyVolume * (fraudRate / 100);
    const stripeFees = fraudVolume * 0.15; // ~15€ per chargeback average
    const totalLosses = fraudVolume + stripeFees;

    // Orylo would prevent ~80% of fraud
    const preventionRate = 0.8;
    const savings = totalLosses * preventionRate;
    const yearlySavings = savings * 12;

    return {
      currentLosses: Math.round(totalLosses),
      stripeFees: Math.round(stripeFees),
      monthlySavings: Math.round(savings),
      yearlySavings: Math.round(yearlySavings),
    };
  }, [monthlyVolume, fraudRate, avgOrderValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <section id="simulator" className="relative py-20 md:py-28">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/50 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-sm font-medium text-zinc-500">
            Savings Simulator
          </p>
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            How much is fraud
            <br />
            <span className="text-zinc-400">really costing you?</span>
          </h2>
          <p className="text-zinc-400">
            Fraud isn&apos;t just about lost merchandise. Calculate your true losses
            (including bank fees) and discover what you could save.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Inputs */}
          <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
            <CardContent className="space-y-8 p-6">
              {/* Monthly Volume */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Monthly Volume (€)</Label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    €
                  </span>
                  <Input
                    type="number"
                    value={monthlyVolume}
                    onChange={(e) => setMonthlyVolume(Number(e.target.value))}
                    className="border-white/10 bg-zinc-800/50 pl-8 text-white"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Total transaction volume processed per month
                </p>
              </div>

              {/* Fraud Rate */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">
                    Fraud/Chargeback Rate (%)
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={fraudRate}
                    onChange={(e) => setFraudRate(Number(e.target.value))}
                    className="border-white/10 bg-zinc-800/50 pr-8 text-white"
                    step={0.1}
                    min={0}
                    max={10}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    %
                  </span>
                </div>
                <Slider
                  value={[fraudRate]}
                  onValueChange={(value) => setFraudRate(value[0])}
                  min={0}
                  max={5}
                  step={0.1}
                  className="py-2"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400">Low Risk (0-1%)</span>
                  <span className="text-red-400">High Risk (&gt;2%)</span>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300">Average Order Value (€)</Label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    €
                  </span>
                  <Input
                    type="number"
                    value={avgOrderValue}
                    onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                    className="border-white/10 bg-zinc-800/50 pl-8 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            {/* Current Losses */}
            <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl">
              <CardContent className="p-6">
                <p className="mb-2 text-sm text-zinc-400">
                  Estimated current losses / month
                </p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(calculations.currentLosses)} €
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Including {formatCurrency(calculations.stripeFees)} € in bank
                  fees (Stripe fees)
                </p>
              </CardContent>
            </Card>

            {/* Potential Savings */}
            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-zinc-900/50 backdrop-blur-xl">
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold text-white">
                  Potential savings with Orylo
                </h3>
                <p className="text-4xl font-bold text-emerald-400">
                  {formatCurrency(calculations.monthlySavings)} €
                </p>
                <p className="mt-1 text-sm text-zinc-400">per month</p>

                <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-zinc-400">
                    Starting at just €99/month
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    Save {formatCurrency(calculations.yearlySavings)} €/year
                  </p>
                </div>

                <Link href="/sign-up" className="mt-6 block">
                  <Button className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
