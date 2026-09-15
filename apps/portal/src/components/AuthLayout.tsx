import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { COMPANY } from "@/components/LegalLayout";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
  /**
   * Registration has ten fields to sign-in's two. Forcing both through one
   * width made the long form a single cramped column on desktop.
   */
  wide?: boolean;
}

/**
 * The mark on its own left this as an unattributed password form on a domain
 * with no history — the shape Safe Browsing reads as credential harvesting,
 * and the first thing a reviewer sees, since "/" bounces anonymous visitors
 * straight here. Name the operator in text, say what the service is, and link
 * the legal pages, which existed all along with nothing pointing at them.
 */
export function AuthLayout({ children, wide = false }: AuthLayoutProps) {
  const legal = [
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/refunds", label: "Refunds" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className={cn("w-full", wide ? "max-w-xl" : "max-w-sm")}>
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* Decorative: the name is spelled out directly below it. */}
          <img
            src="/novahost-mark.png"
            alt=""
            className="h-11 w-11 rounded-xl object-cover shadow-card select-none"
            draggable={false}
          />
          <div>
            <p className="text-base font-semibold">{COMPANY.name}</p>
            <p className="text-xs text-muted-foreground">
              Expert Advisor hosting and licence management
            </p>
          </div>
        </div>

        <Card className="p-6">{children}</Card>

        <footer className="mt-6 text-center text-xs text-muted-foreground">
          <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {legal.map(({ to, label }, i) => (
              <span key={to} className="flex items-center gap-x-3">
                {i > 0 && <span aria-hidden="true">&middot;</span>}
                <Link to={to} className="hover:underline">
                  {label}
                </Link>
              </span>
            ))}
          </nav>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} {COMPANY.name} &middot; {COMPANY.address}
          </p>
        </footer>
      </div>
    </div>
  );
}
