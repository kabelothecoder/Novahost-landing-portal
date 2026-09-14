import LegalLayout, { COMPANY } from "@/components/LegalLayout";

export default function Contact() {
  return (
    <LegalLayout
      title="Contact & Support"
      intro={
        <p>
          Email is the fastest way to reach us. We read every message and aim to reply within
          3&nbsp;business days.
        </p>
      }
    >
      <h2>Support</h2>
      <p>
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
      <p>To help us resolve things on the first reply, please include:</p>
      <ul>
        <li>the email address linked to your licence or payment;</li>
        <li>
          your PayFast payment reference (for anything about billing, delivery of a key, or a refund);
        </li>
        <li>
          the make and model of your phone, and what you were doing when the problem happened (for
          anything about the app);
        </li>
        <li>a screenshot of any error message.</li>
      </ul>

      <h2>Common requests</h2>
      <ul>
        <li>
          <strong>Didn&rsquo;t get your licence key?</strong> Check spam first, then email us with
          your payment reference.
        </li>
        <li>
          <strong>Changing phones?</strong> Use the device-move option in the app. Email us only if
          it fails or you have used up your self-service moves.
        </li>
        <li>
          <strong>Refund query?</strong> See the <a href="/refunds">Refund Policy</a>, then email us
          with the details listed there.
        </li>
        <li>
          <strong>Privacy request?</strong> See the <a href="/privacy">Privacy Policy</a>; send
          access, correction, or deletion requests to the same address.
        </li>
      </ul>

      {/*
        This site markets the app to the people who run a robot on it. The
        provider portal is a separate product on its own unlisted hostname, so
        the enquiry goes through the inbox we already monitor rather than to a
        link we would then have to publish.
      */}
      <h2>Listing a robot on NovaHost</h2>
      <p>
        If you build or sell an Expert Advisor and want it hosted on NovaHost so your buyers can
        run it from their phones, email us with &ldquo;Hosting&rdquo; in the subject line and we
        will take it from there.
      </p>

      <h2>Business details</h2>
      <p>
        {COMPANY.legalName}
        {COMPANY.registration ? (
          <>
            <br />
            Registration: {COMPANY.registration}
          </>
        ) : null}
        <br />
        Trading as {COMPANY.name}
        <br />
        {COMPANY.address}
        <br />
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </p>
    </LegalLayout>
  );
}
