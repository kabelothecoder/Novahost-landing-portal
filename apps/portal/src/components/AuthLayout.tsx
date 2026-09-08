import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
  /**
   * Registration has ten fields to sign-in's two. Forcing both through one
   * width made the long form a single cramped column on desktop.
   */
  wide?: boolean;
}

export function AuthLayout({ children, wide = false }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className={cn("w-full", wide ? "max-w-xl" : "max-w-sm")}>
        <div className="mb-6 flex justify-center">
          <img
            src="/novahost-mark.png"
            alt="NovaHost"
            className="h-11 w-11 rounded-xl object-cover shadow-card select-none"
            draggable={false}
          />
        </div>

        <Card className="p-6">{children}</Card>
      </div>
    </div>
  );
}
