import { Smartphone } from "lucide-react";
import { IOS_APP_URL } from "@/lib/site";
import { VISOR } from "./Brand";

/**
 * The one way to get the app.
 *
 * The app is an installable web app that runs on iPhone and Android alike, so
 * there is a single control that opens the app origin. The copy says "Install"
 * — calling it a download would set the wrong expectation.
 */
export function DownloadButtons({ size = "lg" }: { size?: "lg" | "sm" }) {
  const pad = size === "lg" ? "px-6 py-3.5 text-[15px]" : "px-5 py-3 text-[14px]";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <a
        href={IOS_APP_URL}
        className={`group inline-flex items-center justify-center gap-2.5 rounded-full font-semibold text-ground transition-transform hover:scale-[1.03] ${pad}`}
        style={{ backgroundImage: VISOR }}
      >
        <Smartphone size={17} />
        Install the app
      </a>
    </div>
  );
}
