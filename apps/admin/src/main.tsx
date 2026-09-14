import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { missingConfig } from "./integrations/novahost/client";
import "./index.css";

/**
 * What a deploy with no environment variables looks like.
 *
 * Without this it looks like nothing: a white page, a green build, and the real
 * reason sitting in a console nobody opens. The trap is specific enough to name
 * on screen, because naming it is the whole difference between a two-minute fix
 * and an afternoon — a `VITE_`-prefixed variable set as a Vercel **Secret** is
 * deliberately kept out of the browser bundle and arrives as `undefined`.
 *
 * Deliberately plain HTML with inline styles: if the app is this broken, the
 * stylesheet and the component tree are not things to rely on.
 */
function ConfigurationNeeded({ missing }: { missing: string[] }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0a0a0a",
        color: "#e8e8e8",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "520px" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 600, margin: "0 0 12px" }}>
          NovaHost Admin is not configured
        </h1>

        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#a0a0a0", margin: "0 0 16px" }}>
          {missing.length === 1
            ? "One required environment variable is missing:"
            : `${missing.length} required environment variables are missing:`}
        </p>

        <ul style={{ margin: "0 0 20px", paddingLeft: "20px" }}>
          {missing.map((name) => (
            <li
              key={name}
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: "13px",
                color: "#f0729e",
                marginBottom: "4px",
              }}
            >
              {name}
            </li>
          ))}
        </ul>

        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#a0a0a0", margin: "0 0 16px" }}>
          Set them in the Vercel project, then redeploy.
        </p>

        <div
          style={{
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            padding: "14px 16px",
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#a0a0a0",
            background: "#121212",
          }}
        >
          <strong style={{ color: "#e8e8e8", fontWeight: 600 }}>
            If they are already set, check their type.
          </strong>{" "}
          A <code style={{ color: "#22c9e8" }}>VITE_</code>-prefixed variable must be{" "}
          <strong style={{ color: "#e8e8e8" }}>Config</strong>, not{" "}
          <strong style={{ color: "#e8e8e8" }}>Secret</strong>. Vercel keeps Secret values out of
          the browser bundle on purpose, so the build succeeds and the value arrives empty — which
          looks exactly like not setting it at all.
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {missingConfig.length > 0 ? <ConfigurationNeeded missing={missingConfig} /> : <App />}
  </StrictMode>,
);
