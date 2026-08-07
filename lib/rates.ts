export async function rateForPlatform(platform: string) {
  const isTikTok = platform === "tiktok";
  const defaultRate = isTikTok ? 3000 : 2000;
  const legacyRate = isTikTok ? 1000 : 500;
  const configured = Number(
    isTikTok
      ? process.env.TIKTOK_RATE_PER_VIEW_MICRO_USDC
      : process.env.X_RATE_PER_VIEW_MICRO_USDC,
  );

  // Automatically upgrade installations that still have Clicks' old defaults
  // saved in Netlify, while preserving any intentional custom rate.
  return !Number.isFinite(configured) ||
    configured <= 0 ||
    configured === legacyRate
    ? defaultRate
    : configured;
}

export function formatCpm(ratePerViewMicros: number) {
  return ((ratePerViewMicros * 1000) / 1_000_000).toFixed(2);
}
