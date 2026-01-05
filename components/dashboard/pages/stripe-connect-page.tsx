"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw,
} from "lucide-react";

import { connectStripeAccount } from "@/lib/actions/stripe-connect";
import type { StripeConnection } from "@/lib/db/schemas/stripeConnections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function StripeConnectPage({
  organizationId,
  connections = [],
}: {
  organizationId: string;
  connections?: StripeConnection[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isConnecting, setIsConnecting] = useState(false);

  const hasActiveConnection = connections.some((c) => c.isActive);
  const activeConnection = connections.find((c) => c.isActive);

  // Check for success/error messages from redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const reason = searchParams.get("reason");

    if (success === "stripe_connected") {
      toast.success("Compte Stripe connecté", {
        description: "Votre compte a été connecté avec succès !",
      });
      // Rediriger vers le dashboard après un court délai
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }

    if (error === "stripe_connection_failed") {
      toast.error("Échec de la connexion", {
        description: reason
          ? `Erreur: ${reason}`
          : "Impossible de connecter votre compte Stripe",
      });
    }
  }, [searchParams, router]);

  const handleConnect = () => {
    setIsConnecting(true);
    startTransition(async () => {
      try {
        const result = await connectStripeAccount();

        if (result.error) {
          toast.error("Erreur", {
            description: result.error,
          });
          setIsConnecting(false);
          return;
        }

        if (result.url) {
          // Rediriger vers Stripe OAuth
          window.location.href = result.url;
        }
      } catch (error) {
        toast.error("Erreur", {
          description: "Impossible de générer le lien de connexion Stripe",
        });
        setIsConnecting(false);
      }
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Jamais";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Connexion Stripe</h1>
        <p className="text-muted-foreground">
          {hasActiveConnection
            ? "Gérez vos comptes Stripe connectés."
            : "Connectez votre compte Stripe pour commencer à analyser vos transactions et détecter la fraude en temps réel."}
        </p>
      </div>

      {searchParams.get("success") === "stripe_connected" && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Connexion réussie ! Redirection en cours...
          </AlertDescription>
        </Alert>
      )}

      {searchParams.get("error") === "stripe_connection_failed" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            La connexion a échoué. Veuillez réessayer.
          </AlertDescription>
        </Alert>
      )}

      {/* Show existing connections */}
      {connections.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Comptes connectés</h2>
          <div className="space-y-3">
            {connections.map((connection) => (
              <Card
                key={connection.id}
                className={
                  connection.isActive
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-muted"
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-primary/10 p-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium font-mono text-sm">
                            {connection.stripeAccountId}
                          </span>
                          <Badge
                            variant={connection.isActive ? "default" : "secondary"}
                            className={
                              connection.isActive
                                ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                : ""
                            }
                          >
                            {connection.isActive ? "Actif" : "Inactif"}
                          </Badge>
                          <Badge variant="outline">
                            {connection.livemode ? "Production" : "Test"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>
                            Connecté le {formatDate(connection.createdAt)}
                          </span>
                          <span>•</span>
                          <span>
                            Dernière sync : {formatDate(connection.lastSyncAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" title="Synchroniser">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Paramètres">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>
                  {hasActiveConnection
                    ? "Ajouter un autre compte"
                    : "Connectez votre compte"}
                </CardTitle>
                <CardDescription>
                  Autorisez Orylo à accéder à vos données Stripe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              En connectant votre compte Stripe, vous autorisez Orylo à :
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>Analyser vos transactions en temps réel</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>Détecter les comportements frauduleux</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>Générer des alertes personnalisées</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>Bloquer automatiquement les transactions suspectes</span>
              </li>
            </ul>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || isPending}
              className="w-full"
              size="lg"
            >
              {isConnecting || isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  {hasActiveConnection
                    ? "Connecter un autre compte"
                    : "Connecter avec Stripe"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sécurité et confidentialité</CardTitle>
            <CardDescription>Vos données sont protégées</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nous prenons la sécurité très au sérieux :
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Connexion sécurisée :</strong> Utilise Stripe Connect
                  OAuth pour une autorisation sécurisée
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Données chiffrées :</strong> Tous les tokens sont
                  chiffrés en base de données
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Permissions limitées :</strong> Nous demandons
                  uniquement l'accès nécessaire
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>Révocable à tout moment :</strong> Vous pouvez
                  déconnecter votre compte quand vous le souhaitez
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Stats summary if connected */}
      {hasActiveConnection && activeConnection && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-500/20 p-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Compte Stripe actif</h3>
                  <p className="text-sm text-muted-foreground">
                    La détection de fraude est activée pour{" "}
                    <span className="font-mono">
                      {activeConnection.stripeAccountId}
                    </span>
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Voir le dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-muted-foreground/20">
        <CardHeader>
          <CardTitle className="text-base">Besoin d'aide ?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Si vous rencontrez des problèmes lors de la connexion, consultez
            notre{" "}
            <a href="/docs" className="text-primary hover:underline">
              documentation
            </a>{" "}
            ou{" "}
            <a href="/contact" className="text-primary hover:underline">
              contactez notre support
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
