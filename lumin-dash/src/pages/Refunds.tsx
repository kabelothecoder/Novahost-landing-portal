import LegalLayout, { COMPANY } from "@/components/LegalLayout";

/**
 * REFUND STANCE (per the user, 3 Sep 2026):
 *
 *   Once a licence key is ACTIVATED, there is NO refund.
 *
 * Before activation, an unused key can be refunded within 14 days (kept because
 * it heads off card disputes over keys that were never used). The section 3
 * carve-out — non-delivery, a defect we can't fix, double charge — stays
 * because those are Consumer Protection Act rights that can't be contracted
 * away, and PayFast's compliance review looks for them. Device-move and
 * reactivation fees are non-refundable once processed.
 */

export default function Refunds() {
  return (
    <LegalLayout
      title="Refund Policy"
      intro={
        <p>
          NovaHost is a digital product. Your licence key is delivered by email as soon as your
          payment is confirmed, and the app unlocks as soon as the key is activated.{" "}
          <strong>Once a licence key has been activated, the sale is final and no refund is
          available</strong>, except where the law requires one (section&nbsp;3). This policy does
          not take away any right you have under the Consumer Protection Act.
        </p>
      }
    >
      <h2>1. Before your licence is activated</h2>
      <p>
        If you have paid but <strong>have not yet activated your licence key</strong> (it is not
        bound to a device), you can ask for a full refund within <strong>14 days</strong> of payment.
        We cancel the unused key and refund the full amount to your original payment method. After
        14 days, or once the key is activated, this option no longer applies.
      </p>

      <h2>2. After your licence is activated &mdash; no refund</h2>
      <p>
        Activation binds the key to your device and delivers the product to you, so{" "}
        <strong>activated licences are non-refundable</strong>. This includes a change of mind, no
        longer wanting the app, or not having used it much. The only exceptions are the
        legally-required cases in section&nbsp;3.
      </p>

      <h2>3. If something is wrong on our side</h2>
      <p>You are entitled to a full refund if:</p>
      <ul>
        <li>you paid and did not receive your licence key, and we cannot deliver it; or</li>
        <li>
          the app or a paid feature does not work because of a defect on our side that we cannot fix
          within a reasonable time after you report it; or
        </li>
        <li>you were charged more than once for the same purchase, or charged in error.</li>
      </ul>
      <p>
        This reflects your rights under the Consumer Protection Act, and nothing in this policy limits
        those rights.
      </p>

      <h2>4. What is not refundable</h2>
      <ul>
        <li>
          <strong>Device-move and reactivation fees</strong>, once the move or reactivation has been
          processed.
        </li>
        <li>
          A change of mind after activation, or the fact that trading on your account lost money.
          NovaHost is a tool; it does not guarantee any result, and trading outcomes are not a defect
          in the software.
        </li>
        <li>
          Your mentor ending your arrangement, or your broker account being unavailable. These are
          outside our control.
        </li>
      </ul>

      <h2>5. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> with:
      </p>
      <ul>
        <li>the email address you used to pay;</li>
        <li>your PayFast payment reference or a copy of the payment confirmation;</li>
        <li>which product you are asking about, and a short description of the problem.</li>
      </ul>
      <p>
        We aim to respond within 3&nbsp;business days. Approved refunds are made to the original
        payment method through PayFast, normally within 5&ndash;10&nbsp;business days of approval,
        depending on your bank.
      </p>

      <h2>6. Contact</h2>
      <p>
        {COMPANY.name} &mdash; {COMPANY.legalName}, {COMPANY.address}.{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
