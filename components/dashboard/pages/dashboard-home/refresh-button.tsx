"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh(); // Force re-fetch of Server Components
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Button
      onClick={handleRefresh}
      variant="ghost"
      size="sm"
      className="gap-2 text-zinc-400 hover:text-white hover:bg-white/5"
      disabled={isRefreshing}
    >
      <HugeiconsIcon icon={RefreshCw} className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      Rafraîchir
    </Button>
  );
}
