import { Apple, Download, Smartphone } from "lucide-react";
import { APK_URL, IOS_APP_URL } from "@/lib/site";
import { VISOR } from "./Brand";

/**
 * The two ways to get the app.
 *
 * iOS is an installable web app rather than an App Store listing, so its
 * control opens the app origin and the copy says "Install" — calling it a
 * download would set the wrong expectation at the moment someone taps it.
 *
 * If the APK URL is somehow empty the Android control renders disabled rather
 * than linking to "#". A button that looks live and silently does nothing is
 * worse than one that admits it is not ready.
 */
export function DownloadButtons({ size = "lg" }: { size?: "lg" | "sm" }) {
  const pad = size === "lg" ? "px-6 py-3.5 text-[15px]" : "px-5 py-3 text-[14px]";
  const apkReady = Boolean(APK_URL);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <a
        href={IOS_APP_URL}
        className={`group inline-flex items-center justify-center gap-2.5 rounded-full font-semibold text-ground transition-transform hover:scale-[1.03] ${pad}`}
        style={{ backgroundImage: VISOR }}
      >
        <Apple size={17} />
        Install on iPhone
      </a>

      {apkReady ? (
        <a
          href={APK_URL}
          className={`inline-flex items-center justify-center gap-2.5 rounded-full border border-edge bg-white/[0.04] font-semibold text-ink transition-colors hover:border-[#2E3442] hover:bg-white/[0.07] ${pad}`}
        >
          <Download size={17} className="text-cyan" />
          Download for Android
        </a>
      ) : (
        <span
          className={`inline-flex cursor-not-allowed items-center justify-center gap-2.5 rounded-full border border-edge font-semibold text-ink-4 ${pad}`}
        >
          <Smartphone size={17} />
          Android build coming
        </span>
      )}
    </div>
  );
}
