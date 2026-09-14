import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Home from "@/pages/Home";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refunds from "@/pages/Refunds";
import Contact from "@/pages/Contact";

/**
 * Client-side navigation keeps the previous scroll offset, which lands you
 * halfway down a policy page you have never read. Reset on every path change —
 * but not when only the hash moves, or this fights the in-page anchors.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

/**
 * The marketing site.
 *
 * Five public routes and nothing else — no auth provider, no query client, no
 * protected routes. `/login` and `/register` used to live in this app when the
 * landing and the mentor portal shared a domain; they are gone, and the catch-
 * all sends anything left over from an old link back to the front page rather
 * than to a 404 that teaches the visitor nothing.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
