"use client";

import { JSX, useOptimistic } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  CreditCard
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StripeConnection } from "@/lib/db/schemas";
import {
  connectStripeAccount,
  disconnectStripeAccount,
} from "@/lib/actions/stripe-connect";
import { cn } from "@/lib/utils";

type ConnectStripeCardProps = {
  initialConnections?: StripeConnection[];
};

export function ConnectStripeCard({
  initialConnections = [],
}: ConnectStripeCardProps): JSX.Element {
  const router = useRouter();

  // Filtrer uniquement les connexions actives
  const activeConnections = initialConnections.filter((c) => c.isActive !== false);

  // Utiliser optimistic updates pour les connexions
  const [optimisticConnections, setOptimisticConnections] = useOptimistic(
    activeConnections,
    (state, deletedId: string) => state.filter((c) => c.id !== deletedId)
  );

  // Mutation pour connecter un compte Stripe
  const connectMutation = useMutation({
    mutationFn: connectStripeAccount,
    onSuccess: (result) => {
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.url) {
        throw new Error("URL de redirection Stripe manquante.");
      }

      // Redirection vers Stripe OAuth
      window.location.href = result.url;
    },
    onError: (error: Error) => {
      toast.error("Erreur", { description: error.message });
    },
  });

  // Mutation pour déconnecter un compte Stripe
  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => disconnectStripeAccount(connectionId),
    onMutate: (connectionId) => {
      // Optimistically remove the connection from the UI
      setOptimisticConnections(connectionId);
    },
    onSuccess: () => {
      toast.success("Compte Stripe déconnecté.");
      // Rafraîchir la page pour obtenir les dernières données du serveur
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error("Erreur", { description: error.message });
      // Rafraîchir pour restaurer l'état en cas d'erreur
      router.refresh();
    },
  });

  const handleConnect = async () => {
    await connectMutation.mutateAsync();
  };

  const handleDisconnect = async (connectionId: string) => {
    await disconnectMutation.mutateAsync(connectionId);
  };

  return (
    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-xl hover:border-indigo-500/30 transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-white flex items-center gap-2 text-xl">
              <div className="h-8 w-8 rounded-lg bg-[#635BFF]/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-[#635BFF]" />
              </div>
              Stripe Integration
              {optimisticConnections.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                >
                  {optimisticConnections.length} connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm pl-10">
              Connect your Stripe accounts to analyze transactions and prevent
              fraud in real-time.
            </CardDescription>
          </div>
          <Button
            className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white shadow-lg shadow-[#635BFF]/20"
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            size="sm"
          >
            {connectMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Connect Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {optimisticConnections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-xl bg-white/2 hover:bg-white/4 transition-colors">
            <div className="h-16 w-16 rounded-full bg-[#635BFF]/10 flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-[#635BFF]" />
            </div>
            <h3 className="text-white font-medium text-lg mb-2">
              No accounts connected
            </h3>
            <p className="text-zinc-400 text-sm max-w-sm text-center mb-8">
              Connect your first Stripe account to start monitoring transactions,
              analyzing fraud patterns, and protecting your revenue.
            </p>
            <Button
              className="bg-[#635BFF] hover:bg-[#635BFF]/90 text-white"
              onClick={handleConnect}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Connect Stripe
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4 -mr-4">
            <div className="space-y-4 pr-4">
              {optimisticConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="group rounded-xl bg-white/2 border border-white/5 hover:border-white/10 hover:bg-white/4 transition-all duration-200 overflow-hidden"
                >
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#635BFF]/20 shrink-0">
                        S
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium text-lg">
                            {connection.stripeAccountId}
                          </h3>
                          {connection.isActive && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5"
                            >
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 flex items-center gap-2">
                          Added on{" "}
                          <span className="text-zinc-400">
                            {connection.createdAt instanceof Date
                              ? connection.createdAt.toLocaleDateString()
                              : new Date(connection.createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => handleDisconnect(connection.id)}
                      disabled={disconnectMutation.isPending}
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="px-5 py-4 bg-black/20 border-t border-white/5 grid grid-cols-2 gap-8">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                        <RefreshCw className="h-3 w-3" />
                        Last Synced
                      </div>
                      <span className="text-zinc-300 text-sm font-medium">
                        {connection.lastSyncAt
                          ? connection.lastSyncAt instanceof Date
                            ? connection.lastSyncAt.toLocaleString()
                            : new Date(connection.lastSyncAt).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                        <CheckCircle2 className="h-3 w-3" />
                        Webhook Status
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex h-2 w-2 rounded-full",
                          connection.webhookSecret ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-700"
                        )} />
                        <span className="text-zinc-300 text-sm font-medium">
                          {connection.webhookSecret ? "Configured & Active" : "Not configured"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
