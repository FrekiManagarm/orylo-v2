/**
 * Fraud Detection Types
 *
 * Centralized TypeScript types for the fraud detection system.
 */

// ==========================================
// CORE TRANSACTION TYPES
// ==========================================

/**
 * Full context for a transaction being analyzed
 */
export interface TransactionContext {
  // Transaction basics
  paymentIntentId: string;
  amount: number; // in cents
  currency: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;

  // Stripe references
  stripeChargeId?: string;
  stripeInvoiceId?: string;
  stripeCustomerId?: string;

  // Card details
  cardLast4?: string;
  cardBrand?: string; // visa, mastercard, amex, discover
  cardCountry?: string;
  cardFingerprint?: string;
  cardFunding?: string; // credit, debit, prepaid
  cardExpMonth?: number;
  cardExpYear?: number;

  // Location data
  ipAddress?: string;
  ipCountry?: string;
  ipRegion?: string;
  ipCity?: string;

  // Device data
  deviceFingerprint?: string;
  userAgent?: string;
  deviceType?: string; // mobile, desktop, tablet
  browser?: string;

  // Timing
  timestamp: Date;
  hourOfDay?: number; // 0-23
  dayOfWeek?: number; // 0-6 (Sunday = 0)

  // Customer context (if available)
  customer?: CustomerContext;

  // Velocity data
  velocity?: VelocityMetrics;

  // Invoice/Order context
  invoiceId?: string;
  sessionId?: string;
  metadata?: Record<string, string>;
}

/**
 * Customer context for fraud detection
 */
export interface CustomerContext {
  id: string;
  email?: string;
  name?: string;

  // History
  accountAge: number; // days
  totalPurchases: number;
  totalSpent: number; // euros
  avgPurchaseAmount: number;
  lastPurchaseDate?: Date;
  daysSinceLastPurchase?: number;

  // Risk indicators
  disputeHistory: number;
  refundHistory: number;
  failedPayments: number;
  chargebackHistory: number;

  // Behavior
  purchaseFrequency: number; // per month
  hasActiveSubscription: boolean;
  uniquePaymentMethods: number;

  // Trust score
  trustScore?: number; // 0-100
  tier?: CustomerTier;
  isWhitelisted?: boolean;
  isBlacklisted?: boolean;

  // Consistency
  deviceConsistency?: number; // 0-100
  locationConsistency?: number; // 0-100
}

/**
 * Velocity metrics from card testing tracker
 */
export interface VelocityMetrics {
  attemptsLastHour: number;
  attemptsLastDay: number;
  uniqueCardsUsed: number;
  uniqueIPs?: number;
  rapidAttempts?: boolean; // multiple attempts in < 1 minute
  failureRate?: number; // 0-1
  failedAttempts?: number;
  suspicionScore?: number;
}

// ==========================================
// FRAUD DETECTION TYPES
// ==========================================

/**
 * A single factor influencing the fraud decision
 */
export interface FraudFactor {
  type: FraudFactorType;
  weight: number; // points added/subtracted
  description: string;
  severity: FraudSeverity;
  category?: FraudCategory;
}

/**
 * All possible fraud factor types
 */
export type FraudFactorType =
  // Negative factors
  | "geographic_mismatch"
  | "velocity_abuse"
  | "velocity_elevated"
  | "card_testing"
  | "card_testing_critical"
  | "multiple_cards"
  | "new_account_high_amount"
  | "unusual_amount"
  | "unknown_customer"
  | "dispute_history"
  | "high_amount"
  | "very_high_amount"
  | "small_amount_pattern"
  | "unusual_time"
  | "multiple_payment_methods"
  | "rapid_attempts"
  | "failed_payment_history"
  | "refund_history"
  | "new_device"
  | "new_location"
  | "suspicious_ip"
  | "prepaid_card"
  | "blacklisted_customer"
  | "blocked_tier_customer"
  | "suspicious_customer"
  // Positive factors
  | "vip_customer"
  | "trusted_customer"
  | "loyal_customer"
  | "normal_amount"
  | "known_device"
  | "known_location"
  | "whitelisted_customer"
  | "active_subscription";

/**
 * Severity levels for fraud factors
 */
export type FraudSeverity = "low" | "medium" | "high";

/**
 * Categories for fraud factors
 */
export type FraudCategory =
  | "location"
  | "velocity"
  | "customer"
  | "card"
  | "amount"
  | "behavior"
  | "device";

/**
 * Result of fraud detection analysis
 */
export interface FraudDetectionResult {
  decision: FraudDecision;
  riskScore: number; // 0-100
  confidence: FraudConfidence;
  factors: FraudFactor[];
  recommendedAction?: string;

  // Score breakdown
  baseScore?: number;
  adjustments?: {
    positive: number;
    negative: number;
  };
}

/**
 * Possible fraud detection decisions
 */
export type FraudDecision = "ALLOW" | "BLOCK" | "REVIEW";

/**
 * Confidence level in the decision
 */
export type FraudConfidence = "low" | "medium" | "high";

// ==========================================
// TRUST SCORE TYPES
// ==========================================

/**
 * Customer trust tiers
 */
export type CustomerTier = "blocked" | "suspicious" | "new" | "trusted" | "vip";

/**
 * Result of trust score calculation
 */
export interface TrustScoreResult {
  score: number; // 0-100
  tier: CustomerTier;
  shouldWhitelist: boolean;
  shouldBlacklist: boolean;
  breakdown: {
    baseScore: number;
    positiveFactors: Array<{ name: string; points: number }>;
    negativeFactors: Array<{ name: string; points: number }>;
  };
}

// ==========================================
// CARD TESTING TYPES
// ==========================================

/**
 * A single card testing attempt
 */
export interface CardTestingAttemptData {
  cardFingerprint: string;
  cardLast4?: string;
  cardBrand?: string;
  paymentIntentId?: string;
  timestamp: string; // ISO string
  status: "succeeded" | "failed" | "blocked";
  failureReason?: string;
  failureCode?: string;
  ipAddress?: string;
  amount?: number;
  currency?: string;
}

/**
 * Result of card testing analysis
 */
export interface CardTestingAnalysis {
  suspicionScore: number; // 0-100
  isCardTesting: boolean;
  shouldBlock: boolean;
  reasons: CardTestingReason[];
  metrics: {
    uniqueCards: number;
    totalAttempts: number;
    failureRate: number;
    timespanSeconds: number;
    successfulAttempts: number;
    failedAttempts: number;
  };
  recommendation: FraudDecision;
}

/**
 * Reason for card testing suspicion
 */
export interface CardTestingReason {
  label: string;
  description: string;
  weight: number;
  severity: FraudSeverity;
}

// ==========================================
// AI TYPES
// ==========================================

/**
 * Request for AI explanation generation
 */
export interface AIExplanationRequest {
  decision: FraudDecision;
  riskScore: number;
  confidence: FraudConfidence;
  factors: FraudFactor[];
  transaction: {
    amount: number;
    currency: string;
    customerEmail?: string;
    cardBrand?: string;
    cardLast4?: string;
  };
  customer?: {
    totalPurchases: number;
    disputeHistory: number;
    trustScore?: number;
    tier?: CustomerTier;
  };
  cardTesting?: {
    suspicionScore: number;
    uniqueCards: number;
    totalAttempts: number;
    failedAttempts: number;
    failureRate: number;
    isCardTesting: boolean;
    reasons?: string[];
  };
}

/**
 * Result from AI explanation generation
 */
export interface AIExplanationResult {
  text: string;
  tokensUsed?: number;
  latencyMs: number;
  model: string;
}

// ==========================================
// DETECTION CONTEXT (for database storage)
// ==========================================

/**
 * Context stored with fraud detection records
 */
export interface DetectionContext {
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

  // Customer trust data (snapshot at time of transaction)
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

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Risk score display info
 */
export interface RiskScoreDisplay {
  label: string;
  color: string;
  bgColor: string;
}

/**
 * Decision display info
 */
export interface DecisionDisplay {
  label: string;
  color: string;
  icon: string;
}

/**
 * Tier display info
 */
export interface TierDisplay {
  label: string;
  color: string;
  description: string;
}

// ==========================================
// COMPOSITE RISK SCORE TYPES
// ==========================================

/**
 * Weight configuration for composite score calculation
 */
export interface CompositeScoreWeights {
  riskScore: number; // Weight for general risk score (0-1)
  cardTestingScore: number; // Weight for card testing score (0-1)
}

/**
 * Breakdown of the composite score
 */
export interface CompositeScoreBreakdown {
  // Individual scores
  riskScore: number; // 0-100, general fraud risk score
  cardTestingScore: number; // 0-100, card testing suspicion score

  // Weighted contributions
  riskScoreContribution: number;
  cardTestingContribution: number;

  // Metadata
  hasCardTestingData: boolean;
  cardTestingTrackerId?: string;
}

/**
 * Complete composite risk score result
 */
export interface CompositeRiskScore {
  // Final composite score (0-100)
  totalScore: number;

  // Risk level derived from total score
  riskLevel: CompositeRiskLevel;

  // Detailed breakdown
  breakdown: CompositeScoreBreakdown;

  // Decision based on composite score
  decision: FraudDecision;
  confidence: FraudConfidence;

  // Summary for UI
  summary: {
    label: string;
    description: string;
    primaryRiskSource: "general" | "card_testing" | "both" | "none";
  };
}

/**
 * Risk levels for composite score
 */
export type CompositeRiskLevel =
  | "minimal" // 0-20
  | "low" // 21-35
  | "moderate" // 36-50
  | "elevated" // 51-65
  | "high" // 66-80
  | "critical"; // 81-100

/**
 * Display info for composite risk level
 */
export interface CompositeRiskDisplay {
  level: CompositeRiskLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}
