import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TermsModal } from "@/components/TermsModal";
import { Eye, EyeOff } from "lucide-react";
import { novaHost } from "@/integrations/novahost/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  optional?: boolean;
}

/**
 * One field, ten times over. Each of these was previously spelled out in full,
 * so the label, the error paragraph, the aria wiring and the invalid styling
 * had to be kept in step by hand across every one of them.
 */
function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  optional,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted-foreground">— optional</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={cn(error && "border-destructive")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="section-label">{title}</p>
      {children}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    displayName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    instagramLink: "",
    tiktokLink: "",
    telegramGroupLink: "",
    whatsappGroupLink: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const isValidUrl = (url: string) =>
      /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(url);

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.displayName.trim()) newErrors.displayName = "Display name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.confirmPassword) newErrors.confirmPassword = "Confirm password is required";

    if (!formData.instagramLink.trim()) {
      newErrors.instagramLink = "Instagram link is required";
    } else if (!isValidUrl(formData.instagramLink)) {
      newErrors.instagramLink = "Please enter a valid URL";
    }

    if (!formData.tiktokLink.trim()) {
      newErrors.tiktokLink = "TikTok link is required";
    } else if (!isValidUrl(formData.tiktokLink)) {
      newErrors.tiktokLink = "Please enter a valid URL";
    }

    if (formData.telegramGroupLink.trim() && !isValidUrl(formData.telegramGroupLink)) {
      newErrors.telegramGroupLink = "Please enter a valid URL";
    }

    if (formData.whatsappGroupLink.trim() && !isValidUrl(formData.whatsappGroupLink)) {
      newErrors.whatsappGroupLink = "Please enter a valid URL";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.phone && !/^\+?\d{9,15}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be 9-15 digits, optionally starting with +";
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!agreeToTerms) {
      newErrors.terms = "You must agree to the Terms & Conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await novaHost.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            fullName: formData.fullName,
            displayName: formData.displayName,
            phone: formData.phone,
            instagramLink: formData.instagramLink.trim(),
            tiktokLink: formData.tiktokLink.trim(),
            telegramGroupLink: formData.telegramGroupLink.trim() || null,
            whatsappGroupLink: formData.whatsappGroupLink.trim() || null,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created",
        description: "Check your inbox to verify your email.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Could not create account",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const set = (field: keyof typeof formData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <AuthLayout wide>
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Create your account</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Set up your mentor portal and start issuing licences.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section title="About you">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="fullName"
                label="Full name"
                autoComplete="name"
                placeholder="Jane Mokoena"
                value={formData.fullName}
                error={errors.fullName}
                onChange={set("fullName")}
              />
              <Field
                id="displayName"
                label="Display name"
                autoComplete="nickname"
                placeholder="How subscribers see you"
                value={formData.displayName}
                error={errors.displayName}
                onChange={set("displayName")}
              />
              <Field
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                error={errors.email}
                onChange={set("email")}
              />
              <Field
                id="phone"
                label="Phone"
                type="tel"
                autoComplete="tel"
                placeholder="+27123456789"
                value={formData.phone}
                error={errors.phone}
                onChange={set("phone")}
              />
            </div>
          </Section>

          <Section title="Onboarding channels">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="instagramLink"
                label="Instagram"
                type="url"
                placeholder="https://instagram.com/you"
                value={formData.instagramLink}
                error={errors.instagramLink}
                onChange={set("instagramLink")}
              />
              <Field
                id="tiktokLink"
                label="TikTok"
                type="url"
                placeholder="https://tiktok.com/@you"
                value={formData.tiktokLink}
                error={errors.tiktokLink}
                onChange={set("tiktokLink")}
              />
              <Field
                id="telegramGroupLink"
                label="Telegram group"
                type="url"
                optional
                placeholder="https://t.me/yourgroup"
                value={formData.telegramGroupLink}
                error={errors.telegramGroupLink}
                onChange={set("telegramGroupLink")}
              />
              <Field
                id="whatsappGroupLink"
                label="WhatsApp group"
                type="url"
                optional
                placeholder="https://chat.whatsapp.com/…"
                value={formData.whatsappGroupLink}
                error={errors.whatsappGroupLink}
                onChange={set("whatsappGroupLink")}
              />
            </div>
          </Section>

          <Section title="Security">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => set("password")(e.target.value)}
                    className={cn("pr-10", errors.password && "border-destructive")}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat it"
                    value={formData.confirmPassword}
                    onChange={(e) => set("confirmPassword")(e.target.value)}
                    className={cn("pr-10", errors.confirmPassword && "border-destructive")}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={
                      errors.confirmPassword ? "confirmPassword-error" : undefined
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 text-muted-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </Section>

          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => {
                  setAgreeToTerms(checked as boolean);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: "" }));
                }}
                aria-describedby={errors.terms ? "terms-error" : undefined}
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(true)}
                  className="text-primary hover:underline"
                >
                  Terms &amp; Conditions
                </button>
              </label>
            </div>
            {errors.terms && (
              <p id="terms-error" className="text-xs text-destructive">
                {errors.terms}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <TermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
    </AuthLayout>
  );
}
