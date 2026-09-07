import { novaHost } from "@/integrations/novahost/client";

export async function pushTradeLog(licenseKey: string, pair: string, action: string, pl: number) {
  try {
    const { error } = await novaHost.from('trade_logs').insert({
      license_key: licenseKey,
      pair,
      action,
      pl, 
    });

    if (error) {
      console.error("Failed to push trade log:", error.message);
    }
  } catch (err) {
    console.error("Unexpected error pushing trade log:", err);
  }
}
