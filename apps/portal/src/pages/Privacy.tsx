import LegalLayout, { COMPANY } from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal information {COMPANY.name} ({COMPANY.legalName}) collects,
          why, who we share it with, and the choices you have. We process personal information in line
          with the Protection of Personal Information Act, 2013 (POPIA). {COMPANY.name} is the
          responsible party.
        </p>
      }
    >
      <h2>1. Information we collect</h2>
      <h3>You give us</h3>
      <ul>
        <li>
          <strong>Account details</strong> (mentor portal): email address, password (stored only as a
          salted hash by our authentication provider), and any name or phone number you add to your
          profile.
        </li>
        <li>
          <strong>Licence activation</strong> (app): the licence key you enter and the email
          associated with it.
        </li>
        <li>
          <strong>Broker connection details</strong>: your MetaTrader server name, account login, and
          password, which you enter to link your trading account.
        </li>
        <li>
          <strong>Chart images</strong> you upload to the AI chart scanner.
        </li>
        <li>Anything you send us by email or through a support or feedback form.</li>
      </ul>
      <h3>We collect automatically</h3>
      <ul>
        <li>
          <strong>Device identifier</strong>: a hardware identifier for the phone the app is
          installed on, used to bind your licence to one device.
        </li>
        <li>
          <strong>Service records</strong>: trade and signal-delivery logs (symbol, direction, size,
          time, outcome), entitlement checks, and a &ldquo;last seen&rdquo; timestamp so a mentor can
          tell whether a device is online.
        </li>
        <li>Basic technical data needed to operate the app and portal, such as error diagnostics.</li>
      </ul>
      <p>
        We do <strong>not</strong> collect your card or bank details. Payment is handled entirely by
        PayFast; we receive only a confirmation and a reference.
      </p>

      <h2>2. Why we process it, and on what basis</h2>
      <ul>
        <li>
          <strong>To provide the service</strong> &mdash; activate your licence, link your broker
          account, copy trades, run the scanner, deliver signals (performance of our contract with
          you).
        </li>
        <li>
          <strong>To enforce licensing</strong> &mdash; device binding, entitlement checks, and abuse
          limits (our legitimate interest in preventing licence sharing and fraud).
        </li>
        <li>
          <strong>To take payment</strong> and send you your licence key and receipts (performance of
          contract; legal obligation for tax records).
        </li>
        <li>
          <strong>To support and communicate with you</strong> &mdash; answer queries, send
          service-critical notices such as security alerts (contract; legitimate interest).
        </li>
        <li>
          <strong>To keep the service secure</strong> and diagnose faults (legitimate interest; legal
          obligation).
        </li>
      </ul>
      <p>
        Providing your account, licence, broker, and device information is necessary to use NovaHost.
        If you do not provide it, the relevant feature will not work.
      </p>

      <h2>3. Broker credentials</h2>
      <p>
        Your broker login and password are transmitted over an encrypted connection to our
        trade-copier provider for the sole purpose of creating and maintaining the connection that
        copies trades to your account. We do not use them for anything else and do not share them with
        anyone other than that provider. You can break the connection at any time by removing the link
        in the app and, if you wish, changing your broker password.
      </p>

      <h2>4. The AI chart scanner</h2>
      <p>
        When you scan a chart, the image is sent to a third-party AI provider to be analysed and a
        structured result returned. Send only chart screenshots. Do not include personal information,
        account numbers, or anything confidential in an image you scan.
      </p>

      <h2>5. Who we share information with</h2>
      <p>We use these service providers (&ldquo;operators&rdquo; under POPIA) to run NovaHost:</p>
      <ul>
        <li>
          <strong>Supabase</strong> &mdash; database, authentication, file storage, and backend
          hosting.
        </li>
        <li>
          <strong>Vercel</strong> &mdash; hosting for the mentor portal and this website.
        </li>
        <li>
          <strong>PayFast (Payfast (Pty) Ltd)</strong> &mdash; payment processing.
        </li>
        <li>
          <strong>Our trade-copier provider</strong> &mdash; routes orders from a hosted robot to your
          MetaTrader account.
        </li>
        <li>
          <strong>Resend</strong> &mdash; delivery of transactional email (licence keys, device-move
          codes, security notices).
        </li>
        <li>
          <strong>The AI provider</strong> behind the chart scanner &mdash; analysis of images you
          submit.
        </li>
      </ul>
      <p>
        If you hold a mentor&rsquo;s licence key, that mentor can see operational information tied to
        that key &mdash; for example whether your device is online and whether a signal reached it.
        They do not see your broker password.
      </p>
      <p>
        We may also disclose information if the law requires it, to enforce our terms, or to protect
        our rights, users, or the public.
      </p>

      <h2>6. Sending information outside South Africa</h2>
      <p>
        Some of the providers above process data on servers outside South Africa. Where that happens,
        we rely on the provider being subject to laws or binding rules that give personal information
        a level of protection comparable to POPIA, or on your consent, or on the transfer being
        necessary to perform our contract with you.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        We keep account, licence, and connection data for as long as your account or licence is
        active, and for a period afterwards to meet legal, accounting, and dispute-resolution needs.
        Service and trade logs are kept for a limited period for support and security, then deleted or
        anonymised. Chart images submitted to the scanner are not retained by us for longer than
        needed to return a result.
      </p>

      <h2>8. Your rights</h2>
      <p>Under POPIA you may:</p>
      <ul>
        <li>ask what personal information we hold about you and request a copy;</li>
        <li>ask us to correct or delete information, or object to processing;</li>
        <li>withdraw consent where we relied on it (this does not affect past processing);</li>
        <li>
          complain to the Information Regulator (South Africa) &mdash;{" "}
          <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer">
            inforegulator.org.za
          </a>
          , POPIAComplaints@inforegulator.org.za.
        </li>
      </ul>
      <p>
        To exercise any of these, email{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. We may need to verify your identity
        first.
      </p>

      <h2>9. Security</h2>
      <p>
        We use encryption in transit, hashed passwords, access controls, and row-level database rules
        to protect your information. No system is perfectly secure; if a breach affects your personal
        information we will notify you and the Information Regulator as POPIA requires.
      </p>

      <h2>10. Children</h2>
      <p>NovaHost is not intended for anyone under 18, and we do not knowingly collect their data.</p>

      <h2>11. Changes</h2>
      <p>
        We may update this policy. The &ldquo;last updated&rdquo; date above shows when. Material
        changes will be notified in-app or by email.
      </p>

      <h2>12. Contact</h2>
      <p>
        Information officer / privacy queries:{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Postal / physical address:{" "}
        {COMPANY.address}.
      </p>
    </LegalLayout>
  );
}
