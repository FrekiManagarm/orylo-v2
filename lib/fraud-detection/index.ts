/**
 * Fraud Detection Module
 *
 * Export all fraud detection utilities.
 */

// Types (centralized)
export * from "./types";

// Core detection
export {
  detectFraud,
  getDecisionColor,
  getDecisionLabel,
  generateCardFingerprint,
} from "./engine";

// Trust score (avoid duplicate exports)
export {
  calculateTrustScore,
  getTrustTier,
  getTierInfo,
  type CustomerMetrics,
  type TrustTier,
  type TrustFactor,
} from "./trust-score";

// Customer scoring
export {
  updateCustomerScore,
  getCustomerTrustScore,
  getCustomerContext,
  whitelistCustomer,
  blacklistCustomer,
  resetCustomerLists,
  setCustomerRiskAlert,
  clearCustomerRiskAlert,
  getCustomerReputation,
} from "./customer-scoring";

// Velocity tracking (avoid duplicate VelocityMetrics export)
export {
  calculateVelocityMetrics,
  trackPaymentAttempt,
  shouldBlockSession,
  getSessionSummary,
  type TrackPaymentAttemptResult,
} from "./velocity";

// Card testing detection
export * from "./card-testing";

// Composite risk score
export * from "./composite-score";

// Context building
export * from "./context-builder";

// Utilities (avoid duplicate exports)
export {
  generateDeviceFingerprint,
  extractTimeInfo,
  isUnusualTime,
  isBusinessHours,
  formatAmount,
  formatRiskScore,
  formatDecision,
  formatTier,
  calculatePercentage,
  daysBetween,
  secondsBetween,
  validateTransactionContext,
  isSuspiciousIP,
  isDisposableEmail,
  RISK_THRESHOLDS,
  AMOUNT_THRESHOLDS,
  VELOCITY_THRESHOLDS,
  clampScore,
  getDecisionFromScore,
  getConfidenceFromScore,
} from "./utils";
