/**
 * Custom Rules Application Module
 *
 * Loads and applies user-defined fraud detection rules before system rules.
 * Supports rule matching based on transaction context.
 */

import { db } from "@/lib/db";
import { fraudDetectionRules } from "@/lib/db/schemas/fraudDetectionRules";
import type {
  FraudDetectionRule,
  RuleCondition,
} from "@/lib/db/schemas/fraudDetectionRules";
import type {
  TransactionContext,
  FraudDecision,
  FraudFactor,
} from "./types";
import { eq, and, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";

/**
 * Result of custom rules application
 */
interface CustomRuleResult {
  decision: FraudDecision | null;
  factors: FraudFactor[];
  matchedRule?: FraudDetectionRule;
}

/**
 * Get value from transaction context by field path
 */
function getContextValue(
  context: TransactionContext,
  field: string
): unknown {
  // Handle nested fields with dot notation (e.g., "customer.email")
  const parts = field.split(".");
  let value: any = context;

  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }

  return value;
}

/**
 * Evaluate a rule condition against transaction context
 */
function evaluateCondition(
  condition: RuleCondition,
  context: TransactionContext
): boolean {
  const contextValue = getContextValue(context, condition.field);

  // Handle null/undefined values
  if (contextValue === null || contextValue === undefined) {
    return false;
  }

  // Evaluate based on operator
  switch (condition.operator) {
    case "equals":
      return contextValue === condition.value;

    case "not_equals":
      return contextValue !== condition.value;

    case "greater_than":
      return Number(contextValue) > Number(condition.value);

    case "less_than":
      return Number(contextValue) < Number(condition.value);

    case "greater_than_or_equals":
      return Number(contextValue) >= Number(condition.value);

    case "less_than_or_equals":
      return Number(contextValue) <= Number(condition.value);

    case "contains":
      return String(contextValue)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());

    case "not_contains":
      return !String(contextValue)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());

    case "in":
      if (!Array.isArray(condition.value)) return false;
      return condition.value.includes(contextValue);

    case "not_in":
      if (!Array.isArray(condition.value)) return false;
      return !condition.value.includes(contextValue);

    default:
      logger.warn("Unknown operator", { operator: condition.operator });
      return false;
  }
}

/**
 * Evaluate rule with sub-conditions and logical operators
 */
function evaluateRuleCondition(
  condition: RuleCondition,
  context: TransactionContext
): boolean {
  // Base condition evaluation
  const baseResult = evaluateCondition(condition, context);

  // If no sub-conditions, return base result
  if (!condition.subConditions || condition.subConditions.length === 0) {
    return baseResult;
  }

  // Evaluate sub-conditions with logical operator
  const logicalOp = condition.logicalOperator || "AND";

  if (logicalOp === "AND") {
    // All conditions must be true
    return (
      baseResult &&
      condition.subConditions.every((subCond) =>
        evaluateRuleCondition(subCond, context)
      )
    );
  } else {
    // At least one condition must be true (OR)
    return (
      baseResult ||
      condition.subConditions.some((subCond) =>
        evaluateRuleCondition(subCond, context)
      )
    );
  }
}

/**
 * Map rule action to fraud decision
 */
function mapActionToDecision(action: string): FraudDecision {
  switch (action.toLowerCase()) {
    case "allow":
      return "ALLOW";
    case "block":
      return "BLOCK";
    case "review":
    case "alert":
    case "require_3ds":
      return "REVIEW";
    default:
      logger.warn("Unknown rule action, defaulting to REVIEW", { action });
      return "REVIEW";
  }
}

/**
 * Generate fraud factor from matched rule
 */
function generateFraudFactor(rule: FraudDetectionRule): FraudFactor {
  const decision = mapActionToDecision(rule.action);

  // Determine severity based on decision
  let severity: "low" | "medium" | "high" = "medium";
  if (decision === "BLOCK") severity = "high";
  if (decision === "ALLOW") severity = "low";

  // Calculate weight based on priority and action
  let weight = rule.priority || 0;
  if (decision === "BLOCK") weight += 30;
  if (decision === "REVIEW") weight += 15;
  if (decision === "ALLOW") weight -= 20;

  return {
    type: "custom_rule" as any, // Custom rules have dynamic types
    weight,
    severity,
    description: `Custom Rule: ${rule.name} - ${rule.description || rule.action}`,
    category: "behavior",
  };
}

/**
 * Apply custom fraud detection rules
 *
 * @param context - Transaction context to evaluate
 * @param organizationId - Organization ID (multi-tenant isolation)
 * @returns CustomRuleResult with decision and factors, or null if no match
 */
export async function applyCustomRules(
  context: TransactionContext,
  organizationId: string
): Promise<CustomRuleResult> {
  logger.info("Applying custom rules", {
    organizationId,
    paymentIntentId: context.paymentIntentId,
  });

  try {
    // ==========================================
    // 1. LOAD ACTIVE RULES (sorted by priority DESC)
    // ==========================================
    const rules = await db.query.fraudDetectionRules.findMany({
      where: and(
        eq(fraudDetectionRules.organizationId, organizationId),
        eq(fraudDetectionRules.enabled, true)
      ),
      orderBy: [asc(fraudDetectionRules.priority)], // Lower priority first as per story
    });

    logger.info("Custom rules loaded", {
      organizationId,
      ruleCount: rules.length,
    });

    // No rules to apply
    if (rules.length === 0) {
      return { decision: null, factors: [] };
    }

    // ==========================================
    // 2. EVALUATE RULES IN PRIORITY ORDER
    // ==========================================
    for (const rule of rules) {
      try {
        const matches = evaluateRuleCondition(rule.condition, context);

        if (matches) {
          logger.info("Custom rule matched", {
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action,
            priority: rule.priority,
          });

          // Generate fraud factor
          const factor = generateFraudFactor(rule);

          // Map action to decision
          const decision = mapActionToDecision(rule.action);

          // Return first matching rule (priority wins)
          return {
            decision,
            factors: [factor],
            matchedRule: rule,
          };
        }
      } catch (error) {
        const err = error as Error;
        logger.error("Error evaluating custom rule", {
          ruleId: rule.id,
          ruleName: rule.name,
          error: err.message,
        });
        // Continue to next rule on error
      }
    }

    // ==========================================
    // 3. NO RULE MATCHED
    // ==========================================
    logger.info("No custom rule matched", {
      organizationId,
      rulesEvaluated: rules.length,
    });

    return { decision: null, factors: [] };
  } catch (error) {
    const err = error as Error;
    logger.error("Error in applyCustomRules", {
      organizationId,
      error: err.message,
      stack: err.stack,
    });

    // Return null on error to allow system rules to process
    return { decision: null, factors: [] };
  }
}
