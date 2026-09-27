import {
    createAdminSession,
    createSessionToken,
    deleteAdminSession,
    getDatabase,
    hasSameOrigin,
    isAdmin,
    jsonError,
    jsonResponse,
    sessionCookie,
    sha256
} from "./_auth.js";

const LOGIN_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function getClientKey(request) {
    return sha256(request.headers.get("CF-Connecting-IP") || "unknown-client");
}

export async function onRequestGet(context) {
    try {
        return jsonResponse({ authenticated: await isAdmin(context) });
    } catch (error) {
        console.error("Unable to validate administrator session.", error);
        return jsonError("관리자 세션을 확인하지 못했습니다.", 503);
    }
}

export async function onRequestPost(context) {
    if (!hasSameOrigin(context.request)) {
        return jsonError("허용되지 않은 요청입니다.", 403);
    }

    if (!context.env.ADMIN_PASSWORD) {
        console.error("ADMIN_PASSWORD Cloudflare secret is not configured.");
        return jsonError("관리자 로그인이 아직 설정되지 않았습니다.", 503);
    }

    let body;
    try {
        body = await context.request.json();
    } catch {
        return jsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    if (!body || typeof body.password !== "string" || body.password.length > 100) {
        return jsonError("비밀번호를 확인해 주세요.", 400);
    }

    try {
        const database = getDatabase(context);
        const clientKey = await getClientKey(context.request);
        const now = Date.now();
        const attempt = await database
            .prepare("SELECT failed_count, window_started_at, blocked_until FROM admin_login_attempts WHERE client_key = ?")
            .bind(clientKey)
            .first();

        if (attempt?.blocked_until > now) {
            const retryAfter = Math.ceil((attempt.blocked_until - now) / 1000);
            return jsonError(`로그인 시도가 제한되었습니다. ${retryAfter}초 후 다시 시도해 주세요.`, 429);
        }

        const inputHash = await sha256(body.password);
        const expectedHash = await sha256(context.env.ADMIN_PASSWORD);
        let difference = 0;

        for (let index = 0; index < expectedHash.length; index++) {
            difference |= inputHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
        }

        const valid = difference === 0;

        if (!valid) {
            const nextAttempt = await database
                .prepare("INSERT INTO admin_login_attempts (client_key, failed_count, window_started_at, blocked_until) VALUES (?, 1, ?, 0) ON CONFLICT(client_key) DO UPDATE SET failed_count = CASE WHEN admin_login_attempts.blocked_until > ? THEN admin_login_attempts.failed_count WHEN admin_login_attempts.window_started_at + ? <= ? THEN 1 ELSE admin_login_attempts.failed_count + 1 END, window_started_at = CASE WHEN admin_login_attempts.blocked_until > ? THEN admin_login_attempts.window_started_at WHEN admin_login_attempts.window_started_at + ? <= ? THEN ? ELSE admin_login_attempts.window_started_at END, blocked_until = CASE WHEN admin_login_attempts.blocked_until > ? THEN admin_login_attempts.blocked_until WHEN admin_login_attempts.window_started_at + ? <= ? THEN 0 WHEN admin_login_attempts.failed_count + 1 >= ? THEN ? ELSE 0 END RETURNING failed_count, window_started_at, blocked_until")
                .bind(
                    clientKey,
                    now,
                    now,
                    LOGIN_WINDOW,
                    now,
                    now,
                    LOGIN_WINDOW,
                    now,
                    now,
                    now,
                    LOGIN_WINDOW,
                    now,
                    MAX_ATTEMPTS,
                    now + LOGIN_WINDOW
                )
                .first();
            const blockedUntil = nextAttempt.blocked_until;

            return jsonError(
                blockedUntil
                    ? "로그인 시도가 제한되었습니다. 15분 후 다시 시도해 주세요."
                    : "비밀번호가 올바르지 않습니다.",
                blockedUntil ? 429 : 401
            );
        }

        await database.batch([
            database.prepare("DELETE FROM admin_login_attempts WHERE client_key = ?").bind(clientKey),
            database.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now)
        ]);

        const token = createSessionToken();
        await createAdminSession(context, token);

        return jsonResponse(
            { authenticated: true },
            200,
            { "Set-Cookie": sessionCookie(token, context.request) }
        );
    } catch (error) {
        console.error("Administrator login failed.", error);
        return jsonError("관리자 로그인에 실패했습니다.", 503);
    }
}

export async function onRequestDelete(context) {
    if (!hasSameOrigin(context.request)) {
        return jsonError("허용되지 않은 요청입니다.", 403);
    }

    try {
        await deleteAdminSession(context);
        return jsonResponse(
            { authenticated: false },
            200,
            { "Set-Cookie": sessionCookie("", context.request, 0) }
        );
    } catch (error) {
        console.error("Administrator logout failed.", error);
        return jsonError("관리자 로그아웃에 실패했습니다.", 503);
    }
}
