import {
    getDatabase,
    hasSameOrigin,
    jsonError,
    jsonResponse,
    requireAdmin
} from "./_auth.js";

const VALID_GROUPS = new Set(["open", "middle", "close"]);
const MAX_TASK_TITLE_LENGTH = 80;

export async function onRequestPost(context) {
    if (!hasSameOrigin(context.request)) {
        return jsonError("허용되지 않은 요청입니다.", 403);
    }

    const unauthorized = await requireAdmin(context);
    if (unauthorized) return unauthorized;

    let body;
    try {
        body = await context.request.json();
    } catch {
        return jsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!VALID_GROUPS.has(body?.group) || !title || title.length > MAX_TASK_TITLE_LENGTH) {
        return jsonError(`조를 선택하고 1~${MAX_TASK_TITLE_LENGTH}자 업무명을 입력해 주세요.`, 400);
    }

    try {
        const database = getDatabase(context);
        const id = crypto.randomUUID();
        const order = await database
            .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM checklist_tasks WHERE group_name = ?")
            .bind(body.group)
            .first();

        await database
            .prepare("INSERT INTO checklist_tasks (id, group_name, title, checked, sort_order) VALUES (?, ?, ?, 0, ?)")
            .bind(id, body.group, title, order.next_order)
            .run();

        return jsonResponse({ success: true, id });
    } catch (error) {
        console.error("Unable to add checklist task.", error);
        return jsonError("업무 항목을 추가하지 못했습니다.", 503);
    }
}

export async function onRequestDelete(context) {
    if (!hasSameOrigin(context.request)) {
        return jsonError("허용되지 않은 요청입니다.", 403);
    }

    const unauthorized = await requireAdmin(context);
    if (unauthorized) return unauthorized;

    let body;
    try {
        body = await context.request.json();
    } catch {
        return jsonError("요청 형식이 올바르지 않습니다.", 400);
    }

    if (typeof body?.id !== "string" || !body.id) {
        return jsonError("삭제할 업무 항목을 확인해 주세요.", 400);
    }

    try {
        const result = await getDatabase(context)
            .prepare("DELETE FROM checklist_tasks WHERE id = ?")
            .bind(body.id)
            .run();

        if (result.meta.changes !== 1) {
            return jsonError("삭제할 업무 항목을 찾을 수 없습니다.", 404);
        }

        return jsonResponse({ success: true });
    } catch (error) {
        console.error("Unable to delete checklist task.", error);
        return jsonError("업무 항목을 삭제하지 못했습니다.", 503);
    }
}
