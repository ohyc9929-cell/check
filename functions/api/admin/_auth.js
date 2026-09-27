const SESSION_COOKIE = "check_admin_session";
const SESSION_DURATION = 8 * 60 * 60 * 1000;

function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            ...headers
        }
    });
}

async function sha256(value) {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(value)
    );

    return Array.from(new Uint8Array(digest), byte =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

function getSessionToken(request) {
    const cookie = request.headers.get("Cookie") || "";
    const entry = cookie
        .split(";")
        .map(part => part.trim())
        .find(part => part.startsWith(SESSION_COOKIE + "="));

    return entry ? entry.slice(SESSION_COOKIE.length + 1) : null;
}

export function jsonError(message, status) {
    return jsonResponse({ error: message }, status);
}

export function hasSameOrigin(request) {
    return request.headers.get("Origin") === new URL(request.url).origin;
}

export function getDatabase(context) {
    if (!context.env.DB) {
        throw new Error("Cloudflare D1 binding DB is not configured.");
    }

    return context.env.DB;
}

export async function isAdmin(context) {
    const token = getSessionToken(context.request);
    if (!token) return false;

    const tokenHash = await sha256(token);
    const session = await getDatabase(context)
        .prepare("SELECT 1 AS valid FROM admin_sessions WHERE token_hash = ? AND expires_at > ?")
        .bind(tokenHash, Date.now())
        .first();

    return Boolean(session);
}

export async function requireAdmin(context) {
    if (!await isAdmin(context)) {
        return jsonError("관리자 로그인이 필요합니다.", 401);
    }

    return null;
}

export async function createAdminSession(context, token) {
    const tokenHash = await sha256(token);
    const expiresAt = Date.now() + SESSION_DURATION;

    await getDatabase(context)
        .prepare("INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)")
        .bind(tokenHash, expiresAt)
        .run();

    return expiresAt;
}

export async function deleteAdminSession(context) {
    const token = getSessionToken(context.request);
    if (!token) return;

    const tokenHash = await sha256(token);
    await getDatabase(context)
        .prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
        .bind(tokenHash)
        .run();
}

export function createSessionToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export function sessionCookie(token, request, maxAge = SESSION_DURATION / 1000) {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}

export { jsonResponse, sha256 };
