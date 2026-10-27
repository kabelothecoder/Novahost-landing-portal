import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMPANY } from "@/components/LegalLayout";
import { KeyRound, Server, ShieldCheck } from "lucide-react";

const MAIN_SITE = "https://novahost-ea.app";

const FEATURES = [
  {
    icon: Server,
    title: "Host your Expert Advisor",
    body: "Upload your trading robot once. NovaHost runs it server-side, so your students don't need a VPS or a PC left switched on.",
  },
  {
    icon: KeyRound,
    title: "Issue and manage licence keys",
    body: "Generate a key for each student, see which keys are active, and reactivate or revoke them from one place.",
  },
  {
    icon: ShieldCheck,
    title: "Approved mentors only",
    body: "Every mentor account is reviewed by hand before it can sign in. Students never use this portal. They use the NovaHost app.",
  },
];

/**
 * What a signed-out visitor sees at "/".
 *
 * The root used to bounce straight to /login, so the first thing anyone (or
 * any crawler) saw on this domain was a bare password form. Safe Browsing
 * flagged the domain as "Deceptive pages" twice on that shape. This page says
 * who runs the portal, what it is for, and links back to the main site, with
 * sign-in one click further in.
 */
export default function Welcome() {
  const legal = [
    { to: "/terms", label: "Terms" },
    { to: "/privacy", label: "Privacy" },
    { to: "/refunds", label: "Refunds" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          {/* Decorative: the name sits right beside it. */}
          <img
            src="/novahost-mark.png"
            alt=""
            className="h-9 w-9 rounded-lg object-cover select-none"
            draggable={false}
          />
          <span className="font-semibold">{COMPANY.name} Mentor Portal</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-14 text-center sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            The back office for NovaHost mentors
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {COMPANY.name} hosts trading mentors' Expert Advisors and lets their students
            follow them from the NovaHost app. This portal is where approved mentors manage
            their robots and their students' licence keys.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/login">Mentor sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/register">Apply to become a mentor</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Looking for the NovaHost app?{" "}
            <a href={MAIN_SITE} className="text-primary hover:underline">
              Visit novahost-ea.app
            </a>
          </p>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-5">
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-3 font-medium">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <a href={MAIN_SITE} className="hover:underline">
            novahost-ea.app
          </a>
          {legal.map(({ to, label }) => (
            <span key={to} className="flex items-center gap-x-3">
              <span aria-hidden="true">&middot;</span>
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
  );
}
