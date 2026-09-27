import { isAdmin } from "./admin/_auth.js";

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
        }
    });
}

function getDatabase(context) {
    if (!context.env.DB) {
        throw new Error("Cloudflare D1 binding DB is not configured.");
    }

    return context.env.DB;
}

export async function onRequestGet(context) {
    try {
        const database = getDatabase(context);
        const { results } = await database
            .prepare("SELECT id, group_name, title, checked, checked_by FROM checklist_tasks ORDER BY CASE group_name WHEN 'open' THEN 0 WHEN 'middle' THEN 1 ELSE 2 END, sort_order, id")
            .all();

        return jsonResponse({
            admin: await isAdmin(context),
            tasks: results.map(row => ({
                id: row.id,
                group: row.group_name,
                title: row.title,
                checked: row.checked === 1,
                checkedBy: row.checked_by
            }))
        });
    } catch (error) {
        console.error("Unable to load shared checklist.", error);
        return jsonResponse({ error: "공유 체크리스트를 불러오지 못했습니다." }, 503);
    }
}

export async function onRequestPost(context) {
    let update;

    try {
        update = await context.request.json();
    } catch {
        return jsonResponse({ error: "요청 형식이 올바르지 않습니다." }, 400);
    }

    if (
        !update ||
        typeof update !== "object" ||
        Array.isArray(update) ||
        typeof update.id !== "string" ||
        typeof update.checked !== "boolean" ||
        typeof update.employeeName !== "string" ||
        update.employeeName.trim().length < 1 ||
        update.employeeName.trim().length > 40
    ) {
        return jsonResponse({ error: "요청 형식이 올바르지 않습니다." }, 400);
    }

    try {
        const database = getDatabase(context);
        const result = await database
            .prepare("UPDATE checklist_tasks SET checked = ?, checked_by = ? WHERE id = ?")
            .bind(update.checked ? 1 : 0, update.checked ? update.employeeName.trim() : null, update.id)
            .run();

        if (result.meta.changes !== 1) {
            return jsonResponse({ error: "업무 항목을 찾을 수 없습니다. 새로고침해 주세요." }, 404);
        }

        return jsonResponse({ success: true });
    } catch (error) {
        console.error("Unable to save shared checklist.", error);
        return jsonResponse({ error: "공유 체크리스트를 저장하지 못했습니다." }, 503);
    }
}
