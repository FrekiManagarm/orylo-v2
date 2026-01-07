import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth.server";
import { Organization } from "@/lib/db/schemas";
import { getStripeConnections } from "@/lib/actions/stripe-connect";

import { ConnectStripeCard } from "@/components/dashboard/pages/connect/stripe-connect-card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stripe Connect | Orylo",
  description:
    "Connect your Stripe account to analyze transactions and prevent fraud in real-time.",
};

const ConnectPage = async () => {
  const requestHeaders = await headers();

  const [session, organizations, connections] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }),
    auth.api.listOrganizations({ headers: requestHeaders }),
    getStripeConnections(),
  ]);

  if (!session) {
    redirect("/sign-in");
  }

  const orgList = (organizations ?? []) as Organization[];

  if (orgList.length === 0) {
    redirect("/create-organization");
  }

  const organization = orgList[0];

  return (
    <div className="bg-black min-h-screen space-y-8 relative overflow-hidden p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-900/0 to-zinc-900/0 pointer-events-none" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Connect
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage your payment provider integrations.
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <ConnectStripeCard initialConnections={connections} />
      </div>
    </div>
  );
};

export default ConnectPage;
