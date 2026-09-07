import LegalLayout, { COMPANY } from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro={
        <p>
          These terms are the agreement between you and {COMPANY.legalName}
          {COMPANY.registration ? ` (registration ${COMPANY.registration})` : ""} (&ldquo;
          {COMPANY.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), trading from{" "}
          {COMPANY.address}, for use of the {COMPANY.name} mobile app and mentor portal. By
          downloading the app, creating an account, or entering a licence key, you accept these
          terms. If you do not accept them, do not use the service.
        </p>
      }
    >
      <h2>1. What NovaHost is</h2>
      <p>
        NovaHost is software. It hosts a trading mentor&rsquo;s automated strategy (an &ldquo;Expert
        Advisor&rdquo; or &ldquo;robot&rdquo;) and copies the trades that robot generates onto the
        MetaTrader&nbsp;4 or MetaTrader&nbsp;5 account you link, sized to your balance and the limits
        you set. It also includes an AI chart-scanning tool and per-symbol risk controls.
      </p>
      <p>
        <strong>NovaHost is not a financial services provider.</strong> We are not a broker, an
        authorised financial services provider (FSP), a portfolio manager, or a financial adviser. We
        do not hold, receive, or transfer your money. We do not give financial, investment, or tax
        advice, and nothing in the app &mdash; including chart-scanner output, robot signals, or
        default lot-size suggestions &mdash; is a recommendation to enter any trade. Every trading
        decision executed on your account is yours.
      </p>

      <h2>2. Who may use it</h2>
      <p>
        You must be at least 18 years old and legally able to enter into a contract. You are
        responsible for keeping your account credentials, licence key, and linked device secure.
        Trading derivatives is restricted or prohibited in some countries &mdash; you are responsible
        for making sure your use of NovaHost is lawful where you are.
      </p>

      <h2>3. Licence keys and device binding</h2>
      <ul>
        <li>
          A licence key grants one person the right to use the app on <strong>one device</strong>.
          The key binds to that device on activation.
        </li>
        <li>
          To move your licence to a new phone, use the in-app device-move process. It carries the
          fee shown at the time (currently the &ldquo;device move&rdquo; price) and is rate-limited
          to discourage licence sharing.
        </li>
        <li>
          You may not share, resell, sublicense, or publish a licence key, or attempt to bypass
          device binding, entitlement checks, or usage limits.
        </li>
        <li>
          A mentor issues the key that ties your app to their robot. If your arrangement with that
          mentor ends, your key may stop receiving that robot&rsquo;s trades. That is between you and
          the mentor; it is not a fault in the app and is not refundable by us.
        </li>
      </ul>

      <h2>4. Payment</h2>
      <p>
        Payments are once-off (not a subscription) and are processed by PayFast. Prices are in South
        African Rand and are shown to you before you pay; the amount displayed at checkout is the
        amount charged. We never see or store your card details. &ldquo;Lifetime access&rdquo; means
        for as long as we operate the service &mdash; it is not a guarantee that the service will run
        indefinitely (see section&nbsp;9). Refunds are governed by our{" "}
        <a href="/refunds">Refund Policy</a>.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          reverse engineer, decompile, or extract source from the app except to the extent the law
          expressly permits;
        </li>
        <li>
          automate, scrape, load-test, or overload the portal, the app, or the backend, or probe
          them for vulnerabilities without our written permission;
        </li>
        <li>
          use the service to break the law, to manipulate a market, or in breach of your
          broker&rsquo;s terms;
        </li>
        <li>upload malware, or content you have no right to upload, through the chart scanner or portal.</li>
      </ul>

      <h2>6. NovaHost and your mentor</h2>
      <p>
        A robot on NovaHost is published by a mentor or signal provider who is independent of us.
        NovaHost is <strong>not a party to</strong> any arrangement between you and a mentor, and a
        mentor is not our agent, employee, or partner. We are not responsible for a mentor&rsquo;s
        strategy, signals, decisions, conduct, fees, claims, or availability, for the results of
        following their robot, or for any dispute between you and them. Choosing a mentor, trusting
        their robot, and agreeing terms with them is entirely your decision and your risk. If a
        mentor stops sending signals, changes their strategy, or ends your arrangement, that is
        between you and the mentor and is not a fault in the service.
      </p>
      <p>
        <strong>If you host a robot</strong>, you are solely responsible for the strategy you
        publish, the signals you send, and your relationship with the people you issue keys to. You
        must not misrepresent past or expected performance, promise returns, or present NovaHost as a
        licensed advisory or fund product. You indemnify us against claims arising from your robot or
        your dealings with your subscribers.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        NovaHost depends on services we do not control &mdash; your broker and its MetaTrader server,
        the trade-copier infrastructure that routes orders, PayFast, and the AI provider that powers
        the chart scanner. Their performance, availability, pricing, spreads, slippage, requotes, and
        outages are outside our control, and we are not liable for them. Your use of your broker
        account remains subject to your broker&rsquo;s own agreement with you.
      </p>

      <h2>8. Trading risk</h2>
      <p>
        <strong>
          Trading forex and contracts for difference carries a high risk of loss. You can lose some
          or all of the money in your trading account, and losses can happen quickly.
        </strong>{" "}
        Automated and copied trading does not reduce that risk and can increase it. Past performance
        of any robot, mentor, or strategy is not a reliable indicator of future results. You are
        responsible for every position opened on your account, for the risk settings you choose, and
        for monitoring your account. Only trade with money you can afford to lose.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We provide the service on a &ldquo;best-effort&rdquo; basis and do not guarantee that it will
        be uninterrupted, error-free, or available at any particular time. We may add, change,
        suspend, or remove features, and we may need to take the service down for maintenance. If we
        discontinue the service entirely, we will give reasonable notice where practicable.
      </p>

      <h2>10. Suspension and termination</h2>
      <p>
        We may suspend or terminate your access if you breach these terms, abuse the service or other
        users, attempt to defeat licensing or security controls, or use the service unlawfully. You
        may stop using the service at any time.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        Nothing in these terms limits liability that cannot be limited by law, including your
        non-waivable rights under the Consumer Protection Act. Subject to that:
      </p>
      <ul>
        <li>
          we are not liable for trading losses, lost profits, lost opportunity, or for loss caused by
          a third-party service in section&nbsp;7;
        </li>
        <li>
          our total liability to you for any claim connected with the service is limited to the
          amount you paid us in the 12&nbsp;months before the claim arose;
        </li>
        <li>the service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.</li>
      </ul>

      <h2>12. Indemnity</h2>
      <p>
        You indemnify us against claims, losses, and costs arising from your breach of these terms,
        your trading activity, or your misuse of the service.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by the law of {COMPANY.jurisdiction}, and the courts of that country
        have jurisdiction. If any provision is found unenforceable, the rest stays in force.
      </p>

      <h2>14. Changes to these terms</h2>
      <p>
        We may update these terms. If a change is material we will make reasonable effort to tell you
        (for example, an in-app or email notice). Continuing to use the service after a change takes
        effect means you accept the updated terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, or see
        the <a href="/contact">Contact</a> page.
      </p>
    </LegalLayout>
  );
}
