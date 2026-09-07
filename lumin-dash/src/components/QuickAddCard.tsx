import { Bot, KeyRound, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

/*
 * Was a full-bleed gradient panel that scaled up on hover and carried three
 * lines of copy explaining that clicking it would open EA registration. It is
 * now the list of things you actually come here to start.
 */
const actions = [
  { label: "Generate a license key", to: "/generate", icon: KeyRound },
  { label: "Register an Expert Advisor", to: "/manage", icon: Bot },
  { label: "Dispatch a trade signal", to: "/dispatcher/quick-trade", icon: Send },
];

export function QuickAddCard() {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border px-5 py-3.5">
        <CardTitle>Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ul>
          {actions.map((action) => (
            <li key={action.to}>
              <button
                type="button"
                onClick={() => navigate(action.to)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{action.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
