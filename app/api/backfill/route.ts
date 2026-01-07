/**
 * API Route: Backfill Composite Scores
 * 
 * POST /api/backfill
 * 
 * Executes the backfill of composite scores for existing fraud detections.
 * Requires authentication.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth.server";
import { headers } from "next/headers";
import {
  backfillCompositeScores,
  getCompositeScoreStats
} from "@/lib/actions/backfill-composite-scores";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return statistics about composite score coverage
    const stats = await getCompositeScoreStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("[Backfill API] Error getting stats:", error);
    return NextResponse.json(
      { error: "Failed to get statistics" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const org = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!session?.user?.id || !org?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Backfill API] Starting backfill...");

    // Execute the backfill
    const result = await backfillCompositeScores({ organizationId: org.id });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Backfill API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
