function metaFlagTrue(v) {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "t" || s === "yes";
  }
  return false;
}

export function decodeJwtPayload(accessToken) {
  if (!accessToken || typeof accessToken !== "string") return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = atob(b64 + pad);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isAppAdmin(user) {
  if (!user) return false;
  const meta = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};
  return metaFlagTrue(meta.is_admin) || metaFlagTrue(appMeta.is_admin);
}

export function isAppAdminSession(session) {
  if (!session?.user) return false;
  if (isAppAdmin(session.user)) return true;
  const payload = decodeJwtPayload(session.access_token);
  if (!payload) return false;
  const meta = payload.user_metadata ?? {};
  const appMeta = payload.app_metadata ?? {};
  return metaFlagTrue(meta.is_admin) || metaFlagTrue(appMeta.is_admin);
}

export function isAppAdminAccess(user, session) {
  return isAppAdminSession(session) || isAppAdmin(user);
}
