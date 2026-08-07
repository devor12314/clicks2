export async function rateForPlatform(platform: string) {
  return platform === "tiktok"
    ? Number(process.env.TIKTOK_RATE_PER_VIEW_MICRO_USDC || 1000)
    : Number(process.env.X_RATE_PER_VIEW_MICRO_USDC || 500);
}

export function formatCpm(ratePerViewMicros: number) {
  return ((ratePerViewMicros * 1000) / 1_000_000).toFixed(2);
}
