import { ensureProfileSchema, getDb } from "@/db";
import { decrypt } from "./crypto";
import { rateForPlatform } from "./rates";
export type Platform = "x" | "tiktok";
export type SocialAccount = {
  id: string;
  userId: string;
  platform: Platform;
  platformUserId: string;
  handle: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
};
export type Clip = {
  id: string;
  userId: string;
  socialAccountId: string | null;
  platform: Platform;
  platformClipId: string;
  url: string;
  handle: string;
  caption: string | null;
  views: number;
  earnedMicros: number;
  lastSyncedAt: number | null;
  status: string;
  createdAt: number;
  displayName?: string | null;
  avatarDataUrl?: string | null;
};
export function parseClipUrl(raw: string) {
  const url = new URL(raw),
    host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "x.com" || host === "twitter.com") {
    const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
    if (!match) throw new Error("Paste a direct X post link.");
    return {
      platform: "x" as const,
      id: match[2],
      handle: match[1].replace(/^@/, ""),
      url: `https://x.com${url.pathname}`,
    };
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const match = url.pathname.match(/^\/@([^/]+)\/video\/(\d+)/);
    if (!match)
      throw new Error(
        "Paste the full TikTok video link, not a shortened link.",
      );
    return {
      platform: "tiktok" as const,
      id: match[2],
      handle: match[1],
      url: `https://www.tiktok.com${url.pathname}`,
    };
  }
  throw new Error("Only X and TikTok links are supported.");
}
export async function fetchMetrics(
  account: SocialAccount,
  platformClipId: string,
) {
  const token = await decrypt(account.accessToken);
  if (account.platform === "x") {
    const res = await fetch(
      `https://api.x.com/2/tweets/${platformClipId}?tweet.fields=author_id,public_metrics,text`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok)
      throw new Error(`X could not verify this post (${res.status}).`);
    const body = (await res.json()) as {
      data?: {
        author_id: string;
        text?: string;
        public_metrics?: { impression_count?: number };
      };
    };
    if (!body.data || body.data.author_id !== account.platformUserId)
      throw new Error("This X post does not belong to the connected account.");
    return {
      views: body.data.public_metrics?.impression_count ?? 0,
      caption: body.data.text ?? null,
    };
  }
  const res = await fetch(
    "https://open.tiktokapis.com/v2/video/query/?fields=id,title,video_description,view_count,share_url",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: [platformClipId] } }),
    },
  );
  if (!res.ok)
    throw new Error(`TikTok could not verify this video (${res.status}).`);
  const body = (await res.json()) as {
    data?: {
      videos?: Array<{
        id: string;
        title?: string;
        video_description?: string;
        view_count?: number;
      }>;
    };
  };
  const video = body.data?.videos?.find((v) => v.id === platformClipId);
  if (!video)
    throw new Error(
      "This TikTok video was not found on the connected account.",
    );
  return {
    views: video.view_count ?? 0,
    caption: video.video_description || video.title || null,
  };
}
export async function syncClip(clip: Clip) {
  if (!clip.socialAccountId) return clip;
  const db = getDb();
  const account = (
    await db<
      SocialAccount[]
    >`SELECT id,user_id AS "userId",platform,platform_user_id AS "platformUserId",handle,access_token AS "accessToken",refresh_token AS "refreshToken",expires_at AS "expiresAt",created_at AS "createdAt",updated_at AS "updatedAt" FROM social_accounts WHERE id=${clip.socialAccountId} LIMIT 1`
  )[0];
  if (!account) return clip;
  try {
    const metrics = await fetchMetrics(account, clip.platformClipId),
      rate = await rateForPlatform(clip.platform),
      earnedMicros = Math.max(
        clip.earnedMicros,
        Math.floor(metrics.views * rate),
      ),
      syncedAt = Date.now();
    await db`UPDATE clips SET views=${metrics.views},caption=${metrics.caption},earned_micros=${earnedMicros},last_synced_at=${syncedAt},status='active' WHERE id=${clip.id}`;
    return {
      ...clip,
      ...metrics,
      earnedMicros,
      lastSyncedAt: syncedAt,
      status: "active",
    };
  } catch {
    return clip;
  }
}
export async function listPublicClips() {
  await ensureProfileSchema();
  const db = getDb();
  let rows: Clip[] = Array.from(
    await db<
      Clip[]
    >`SELECT c.id,c.user_id AS "userId",c.social_account_id AS "socialAccountId",c.platform,c.platform_clip_id AS "platformClipId",c.url,c.handle,c.caption,c.views,c.earned_micros AS "earnedMicros",c.last_synced_at AS "lastSyncedAt",c.status,c.created_at AS "createdAt",u.display_name AS "displayName",u.avatar_data_url AS "avatarDataUrl" FROM clips c JOIN users u ON u.id=c.user_id WHERE c.status='active' ORDER BY c.created_at DESC LIMIT 24`,
  );
  rows = await Promise.all(
    rows.map((c) =>
      !c.lastSyncedAt || Date.now() - c.lastSyncedAt > 600000 ? syncClip(c) : c,
    ),
  );
  return rows
    .map((c) => ({
      ...c,
      platform: c.platform as Platform,
      syncedLabel:
        c.socialAccountId === null
          ? "moderator checked"
          : c.lastSyncedAt
            ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
                -Math.max(1, Math.round((Date.now() - c.lastSyncedAt) / 60000)),
                "minute",
              )
            : "pending",
    }))
    .sort((a, b) => b.views - a.views);
}
