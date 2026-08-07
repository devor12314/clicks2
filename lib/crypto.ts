async function keyBytes() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  if (bytes.length !== 32)
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes in base64");
  return bytes;
}

export async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    await keyBytes(),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value),
    ),
  );
  return btoa(String.fromCharCode(...iv, ...encrypted));
}

export async function decrypt(value: string) {
  const all = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  const iv = all.slice(0, 12);
  const data = all.slice(12);
  const key = await crypto.subtle.importKey(
    "raw",
    await keyBytes(),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return new TextDecoder().decode(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data),
  );
}
