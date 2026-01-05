"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  ShieldAlert,
  Activity,
  User,
  ShieldCheck,
  Shield,
  Eye,
  Globe,
  Monitor,
  Bot,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Fingerprint,
  MapPin,
  Star,
  XCircle,
  CheckCircle,
  AlertCircle,
  Wallet,
  History,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DetectionContext {
  // Location data
  ipAddress?: string;
  ipCountry?: string;
  ipRegion?: string;
  ipCity?: string;
  // Card data
  cardLast4?: string;
  cardBrand?: string;
  cardCountry?: string;
  cardFingerprint?: string;
  cardFunding?: string;
  // Device data
  deviceFingerprint?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  // Velocity metrics
  velocity?: {
    attemptsLastHour: number;
    attemptsLastDay: number;
    uniqueCardsUsed: number;
    rapidAttempts: boolean;
  };
  // Customer trust data
  customer?: {
    id?: string;
    accountAge?: number;
    totalPurchases?: number;
    totalSpent?: number;
    avgPurchaseAmount?: number;
    disputeHistory?: number;
    refundHistory?: number;
    trustScore?: number;
    tier?: string;
    whitelisted?: boolean;
  };
  // Transaction patterns
  transactionPatterns?: {
    unusualAmount?: boolean;
    unusualTime?: boolean;
    newDevice?: boolean;
    newLocation?: boolean;
  };
}

interface TransactionDetailsDrawerProps {
  analysis: {
    id: number;
    paymentIntentId: string;
    customerEmail: string | null;
    amount: number;
    currency: string;
    riskScore: number;
    decision: string;
    confidence: string;
    aiExplanation: string | null;
    detectionContext: DetectionContext | null;
    createdAt: string | Date;
    signals: Record<string, any>;
    agentsUsed: string[];
    blocked: boolean;
    actualOutcome: string | null;
    factors: Array<{
      type: string;
      weight: number;
      description: string;
      severity: "low" | "medium" | "high";
    }>;
  };
}

const getActionBadge = (action: string) => {
  switch (action) {
    case "ALLOW":
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          Accepted
        </Badge>
      );
    case "BLOCK":
      return (
        <Badge
          variant="destructive"
          className="bg-rose-500/10 text-rose-400 border-rose-500/20"
        >
          <ShieldAlert className="mr-1 h-3 w-3" />
          Blocked
        </Badge>
      );
    case "REVIEW":
      return (
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-400 border-orange-500/20"
        >
          <Shield className="mr-1 h-3 w-3" />
          Review
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-zinc-400">
          {action}
        </Badge>
      );
  }
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);
};

const getTierBadge = (tier?: string) => {
  switch (tier) {
    case "vip":
      return (
        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
          <Star className="mr-1 h-3 w-3" />
          VIP
        </Badge>
      );
    case "trusted":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          <CheckCircle className="mr-1 h-3 w-3" />
          Trusted
        </Badge>
      );
    case "new":
      return (
        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          <User className="mr-1 h-3 w-3" />
          New
        </Badge>
      );
    case "suspicious":
      return (
        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
          <AlertCircle className="mr-1 h-3 w-3" />
          Suspicious
        </Badge>
      );
    case "blocked":
      return (
        <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">
          <XCircle className="mr-1 h-3 w-3" />
          Blocked
        </Badge>
      );
    default:
      return (
        <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
          Unknown
        </Badge>
      );
  }
};

const getConfidenceBadge = (confidence: string) => {
  switch (confidence) {
    case "high":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
          High Confidence
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
          Medium Confidence
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs">
          Low Confidence
        </Badge>
      );
    default:
      return null;
  }
};

const MetricCard = ({
  label,
  value,
  icon: Icon,
  variant = "default"
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
}) => {
  const variantClasses = {
    default: "text-zinc-200",
    success: "text-emerald-400",
    warning: "text-orange-400",
    danger: "text-rose-400",
  };

  return (
    <div className="bg-zinc-950/50 p-2.5 rounded border border-white/5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-zinc-500" />}
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">
          {label}
        </span>
      </div>
      <span className={cn("text-sm font-mono font-medium", variantClasses[variant])}>
        {value}
      </span>
    </div>
  );
};

const PatternFlag = ({
  label,
  active,
  description
}: {
  label: string;
  active: boolean;
  description?: string;
}) => (
  <div className={cn(
    "flex items-center justify-between p-2 rounded border",
    active
      ? "bg-orange-500/5 border-orange-500/20"
      : "bg-zinc-950/50 border-white/5"
  )}>
    <div className="flex items-center gap-2">
      {active ? (
        <AlertTriangle className="h-3 w-3 text-orange-400" />
      ) : (
        <CheckCircle className="h-3 w-3 text-emerald-400" />
      )}
      <span className={cn("text-xs", active ? "text-orange-300" : "text-zinc-400")}>
        {label}
      </span>
    </div>
    <span className={cn(
      "text-[10px] font-medium px-1.5 py-0.5 rounded",
      active
        ? "bg-orange-500/10 text-orange-400"
        : "bg-emerald-500/10 text-emerald-400"
    )}>
      {active ? "DETECTED" : "NORMAL"}
    </span>
  </div>
);

// Helper function to parse markdown-like text
const parseMarkdownText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // Empty line
    if (line.trim() === '') {
      return <div key={index} className="h-2" />;
    }

    // Handle bullet points (- or * at start)
    const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (bulletMatch) {
      return (
        <div key={index} className="flex items-start gap-2 mb-1.5">
          <span className="text-purple-400 mt-1.5 text-xs">•</span>
          <span className="flex-1 text-zinc-300">{parseBoldText(bulletMatch[1], index)}</span>
        </div>
      );
    }

    // If line starts with "**" followed by ":", it's a heading
    const headingMatch = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
    if (headingMatch) {
      return (
        <div key={index} className="mt-3 first:mt-0">
          <h4 className="text-xs uppercase tracking-wider font-medium text-zinc-400 mb-1">
            {headingMatch[1]}
          </h4>
          <p className="text-zinc-300">{parseBoldText(headingMatch[2], index)}</p>
        </div>
      );
    }

    // Regular line with potential bold text
    return (
      <p key={index} className="mb-2 last:mb-0 text-zinc-300">
        {parseBoldText(line, index)}
      </p>
    );
  });
};

// Helper to parse bold text within a line
const parseBoldText = (text: string, lineIndex: number) => {
  const boldRegex = /\*\*(.+?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lineIndex}-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }
    // Add bold text
    parts.push(
      <strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold text-white">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lineIndex}-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : text;
};

export function TransactionDetailsDrawer({
  analysis,
}: TransactionDetailsDrawerProps) {
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  const ctx = analysis.detectionContext;
  const signals = analysis.signals || {};

  // Extract all relevant data
  const cardInfo = {
    brand: ctx?.cardBrand,
    last4: ctx?.cardLast4,
    country: ctx?.cardCountry,
    funding: ctx?.cardFunding,
    fingerprint: ctx?.cardFingerprint,
  };

  const velocityData = ctx?.velocity || signals.velocity;
  const customerData = ctx?.customer;
  const patterns = ctx?.transactionPatterns;
  const adjustments = signals.adjustments;

  // Check if we have card testing signals
  const hasVelocityData = velocityData && Object.keys(velocityData).length > 0;
  const hasCustomerData = customerData && Object.keys(customerData).length > 0;
  const hasPatterns = patterns && Object.values(patterns).some(v => v === true);

  const reasons = analysis.factors || [];
  const hasReasons = reasons.length > 0;

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-500 hover:text-white hover:bg-white/5 h-8 w-8"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full w-[400px] border-l border-white/10 bg-zinc-950 text-white">
        <DrawerHeader className="border-b border-white/5 px-6 py-6">
          <DrawerTitle className="text-xl font-medium">
            Transaction Details
          </DrawerTitle>
          <DrawerDescription className="text-zinc-400">
            Detailed analysis for {analysis.paymentIntentId}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* 1. Hero Section: Score & Status */}
          <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-zinc-900/50 border border-white/5 space-y-4">
            <div className="relative">
              {/* Animated Pulse for High Risk */}
              {analysis.riskScore >= 70 && (
                <div className="absolute inset-0 bg-rose-500/20 blur-xl rounded-full animate-pulse" />
              )}
              <div className={cn(
                "relative flex items-center justify-center w-24 h-24 rounded-full border-4",
                analysis.riskScore >= 70 ? "border-rose-500/50 bg-rose-500/10" :
                  analysis.riskScore >= 30 ? "border-orange-500/50 bg-orange-500/10" :
                    "border-emerald-500/50 bg-emerald-500/10"
              )}>
                <div className="flex flex-col items-center">
                  <span className={cn(
                    "text-3xl font-bold",
                    analysis.riskScore >= 70 ? "text-rose-500" :
                      analysis.riskScore >= 30 ? "text-orange-500" :
                        "text-emerald-500"
                  )}>
                    {analysis.riskScore}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Risk Score</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              {getActionBadge(analysis.decision)}
              {analysis.confidence !== "high" && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {analysis.confidence.charAt(0).toUpperCase() + analysis.confidence.slice(1)} Confidence
                </span>
              )}
            </div>
          </div>

          {/* 2. Transaction Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-950/50 rounded border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Amount</span>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-white">
                  {formatCurrency(analysis.amount, analysis.currency)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-zinc-950/50 rounded border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Customer</span>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-white truncate" title={analysis.customerEmail || ""}>
                  {analysis.customerEmail?.split('@')[0] || "Unknown"}
                </span>
              </div>
            </div>
            <div className="p-3 bg-zinc-950/50 rounded border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Payment Method</span>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-white capitalize">
                  {cardInfo.brand} •• {cardInfo.last4}
                </span>
              </div>
            </div>
            <div className="p-3 bg-zinc-950/50 rounded border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Location</span>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-white">
                  {ctx?.ipCountry || "Unknown"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. AI Analysis Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-400" />
                AI Analysis
              </h3>
              {analysis.aiExplanation && analysis.aiExplanation.length > 150 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullExplanation(!showFullExplanation)}
                  className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/5 -mr-2"
                >
                  {showFullExplanation ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Réduire
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Voir tout
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="p-4 rounded-lg bg-zinc-900 border border-white/5 text-sm leading-relaxed">
              {showFullExplanation ? (
                <div className="space-y-1">
                  {parseMarkdownText(analysis.aiExplanation || "No explanation provided.")}
                </div>
              ) : (
                <>
                  <div className="text-zinc-300">
                    {parseBoldText(analysis.aiExplanation?.split('\n')[0] || "No explanation provided.", 0)}
                  </div>

                  {analysis.aiExplanation && analysis.aiExplanation.length > 150 && (
                    <div className="mt-2 pt-2 border-t border-white/5 text-xs text-zinc-500 italic flex items-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      {analysis.aiExplanation.split('\n').filter(line => line.trim()).length - 1} lignes supplémentaires
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 4. Critical Alerts (Conditional) */}
          {(hasVelocityData && (velocityData.suspicionScore || 0) > 50) ||
            (hasPatterns && Object.values(patterns || {}).some(Boolean)) ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                Critical Alerts
              </h3>
              <div className="space-y-2">
                {/* Velocity Alert */}
                {(velocityData.suspicionScore || 0) > 50 && (
                  <div className="flex items-center justify-between p-3 rounded bg-rose-500/10 border border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-rose-400" />
                      <span className="text-sm text-rose-200">High Velocity Activity</span>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">DETECTED</Badge>
                  </div>
                )}
                {/* Patterns Alerts */}
                {Object.entries(patterns || {}).map(([key, active]) => (
                  active && (
                    <div key={key} className="flex items-center justify-between p-3 rounded bg-orange-500/10 border border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-400" />
                        <span className="text-sm text-orange-200">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px]">UNUSUAL</Badge>
                    </div>
                  )
                ))}
              </div>
            </div>
          ) : null}

          {/* 5. Key Risk Factors (Simplified List) */}
          {hasReasons && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-zinc-400" />
                Key Risk Factors
              </h3>
              <div className="space-y-2">
                {reasons.slice(0, 4).map((reason, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      reason.weight > 0 ? "bg-rose-500" : "bg-emerald-500"
                    )} />
                    <div className="flex-1">
                      <p className="text-xs text-zinc-300 line-clamp-1">{reason.description}</p>
                    </div>
                    <span className={cn(
                      "text-xs font-mono font-medium",
                      reason.weight > 0 ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {reason.weight > 0 ? "+" : ""}{reason.weight}
                    </span>
                  </div>
                ))}
                {reasons.length > 4 && (
                  <div className="text-center text-xs text-zinc-500 pt-1">
                    + {reasons.length - 4} other factors
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer / Technical Details Toggle could go here if needed later */}
        </div>

        <DrawerFooter className="border-t border-white/5 bg-zinc-900/30 px-6 py-4">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="w-full bg-zinc-900 border-white/10 hover:bg-white/5 text-zinc-300"
            >
              Close Details
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
