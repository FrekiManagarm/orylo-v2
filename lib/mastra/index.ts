/**
 * Mastra AI Configuration
 *
 * Central configuration for Mastra AI agents and workflows.
 */

import { Mastra } from "@mastra/core/mastra";
import { fraudExplanationAgent, customerAnalysisAgent } from "./agents";
import {
  buildFraudExplanationPrompt,
  buildCustomerAnalysisPrompt,
} from "./prompts";
import type { AIExplanationRequest, AIExplanationResult } from "../fraud-detection/types";

// ==========================================
// MASTRA INSTANCE
// ==========================================

export const mastra = new Mastra({
  agents: {
    fraudExplanationAgent,
    customerAnalysisAgent,
  },
});

// Re-export agents for direct usage
export { fraudExplanationAgent, customerAnalysisAgent };

// Re-export prompts
export * from "./prompts";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate AI explanation for fraud detection result
 */
export async function generateFraudExplanation(
  input: AIExplanationRequest
): Promise<AIExplanationResult> {
  const startTime = Date.now();

  try {
    // Build prompt using centralized builder
    const prompt = buildFraudExplanationPrompt({
      decision: input.decision,
      riskScore: input.riskScore,
      confidence: input.confidence,
      factors: input.factors.map((f) => ({
        type: f.type,
        weight: f.weight,
        description: f.description,
        severity: f.severity,
      })),
      amount: input.transaction.amount,
      currency: input.transaction.currency,
      customerEmail: input.transaction.customerEmail,
      cardBrand: input.transaction.cardBrand,
      cardLast4: input.transaction.cardLast4,
      customerHistory: input.customer
        ? {
          totalPurchases: input.customer.totalPurchases,
          disputeHistory: input.customer.disputeHistory,
          trustScore: input.customer.trustScore,
        }
        : undefined,
      cardTesting: input.cardTesting,
    });

    const response = await fraudExplanationAgent.generate(prompt);

    const latencyMs = Date.now() - startTime;

    return {
      text: response.text,
      tokensUsed: response.usage?.totalTokens,
      latencyMs,
      model: "gpt-4o-mini",
    };
  } catch (error) {
    console.error("[Mastra] Failed to generate fraud explanation:", error);

    // Fallback to simple explanation
    return {
      text: buildFallbackExplanation(input),
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      model: "fallback",
    };
  }
}

/**
 * Analyze customer behavior and provide recommendations
 */
export async function analyzeCustomer(input: {
  accountAge: number;
  totalPurchases: number;
  totalSpent: number;
  disputeHistory: number;
  refundHistory: number;
  uniquePaymentMethods: number;
  hasActiveSubscription: boolean;
  trustScore: number;
  tier: string;
}): Promise<{ text: string; latencyMs: number }> {
  const startTime = Date.now();

  try {
    const prompt = buildCustomerAnalysisPrompt(input);
    const response = await customerAnalysisAgent.generate(prompt);

    return {
      text: response.text,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Mastra] Failed to analyze customer:", error);

    return {
      text: `Client avec score de confiance ${input.trustScore}/100 (${input.tier}). ${input.totalPurchases} achats, ${input.disputeHistory} litige(s).`,
      latencyMs: Date.now() - startTime,
    };
  }
}

// ==========================================
// FALLBACK FUNCTIONS
// ==========================================

/**
 * Build fallback explanation when AI fails
 */
function buildFallbackExplanation(request: AIExplanationRequest): string {
  const { decision, riskScore, factors } = request;

  const topFactors = factors
    .slice(0, 5)
    .map((f) => `- **${f.description}** (${f.weight > 0 ? "+" : ""}${f.weight} points)`)
    .join("\n");

  const decisionText =
    decision === "BLOCK"
      ? "Transaction bloquée"
      : decision === "REVIEW"
        ? "Vérification requise"
        : "Transaction autorisée";

  const recommendationText =
    decision === "BLOCK"
      ? "Maintenir le blocage de cette transaction."
      : decision === "REVIEW"
        ? "Vérifier manuellement avant de procéder."
        : "Transaction sûre, aucune action requise.";

  return `
**Résumé de la Décision:**
${decisionText} - Score de risque: ${riskScore}/100

**Facteurs de Risque:**
${topFactors}

**Recommandation:**
${recommendationText}
  `.trim();
}
