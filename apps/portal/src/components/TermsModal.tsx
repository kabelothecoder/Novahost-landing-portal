import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read our terms and conditions carefully.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6" style={{ maxHeight: 'calc(70vh - 120px)' }}>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-foreground mb-2">1. Introduction</h3>
              <p className="text-muted-foreground">
                We are committed to safeguarding your personal data and ensuring transparency in how we collect, use, and protect your information. This Privacy Policy outlines our practices regarding personal data when you use our services.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">2. Information We Collect</h3>
              <p className="text-muted-foreground">
                We collect personal information that you provide directly to us, such as when you create an account, use our services, or contact us. This may include your name, email address, phone number, and trading preferences.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">3. How We Use Your Information</h3>
              <p className="text-muted-foreground">
                We use your information to provide and improve our services, communicate with you, ensure security, and comply with legal obligations. We do not sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">4. Data Security</h3>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">5. Your Rights</h3>
              <p className="text-muted-foreground">
                You have the right to access, correct, delete, or restrict the processing of your personal data. You may also object to processing or request data portability.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">6. Cookies and Tracking</h3>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to enhance your experience, analyze usage patterns, and provide personalized content.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">7. Third-Party Services</h3>
              <p className="text-muted-foreground">
                Our platform may integrate with third-party services. We are not responsible for the privacy practices of these external services.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">8. Data Retention</h3>
              <p className="text-muted-foreground">
                We retain your personal data only for as long as necessary to provide our services or as required by law.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">9. International Transfers</h3>
              <p className="text-muted-foreground">
                Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">10. Updates to This Policy</h3>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any significant changes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">11. Contact Information</h3>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, please contact us at info@robotrader-bot.com
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">12. Summary for footer</h3>
              <p className="text-muted-foreground">
                By using our services, you agree to our Privacy Policy and Terms of Service. We are committed to protecting your privacy and ensuring secure, transparent services. Your data is never sold to third parties, and you maintain full control over your personal information with rights to access, modify, or delete your data at any time.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}