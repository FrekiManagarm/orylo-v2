/**
 * Mastra AI Agents
 *
 * Agents for AI-powered fraud analysis and explanation generation.
 */

import { Agent, type MastraLanguageModel } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import {
  FRAUD_EXPLANATION_PROMPT,
  CUSTOMER_ANALYSIS_PROMPT,
} from "./prompts";

// Note: Cast nécessaire en raison d'une incompatibilité de version entre @ai-sdk et @mastra
// Le model V3 n'est pas reconnu par la version actuelle de @mastra/core
const gpt4oMini = openai("gpt-4o-mini") as unknown as MastraLanguageModel;

/**
 * Fraud Explanation Agent
 *
 * Generates clear, actionable explanations for fraud detection decisions.
 * Takes risk assessment data and produces human-readable analysis.
 */
export const fraudExplanationAgent = new Agent({
  name: "fraud-explanation-generator",
  model: gpt4oMini,
  instructions: FRAUD_EXPLANATION_PROMPT,
});

/**
 * Customer Analysis Agent
 *
 * Analyzes customer behavior patterns and provides trust recommendations.
 */
export const customerAnalysisAgent = new Agent({
  name: "customer-analysis-agent",
  model: gpt4oMini,
  instructions: CUSTOMER_ANALYSIS_PROMPT,
});
