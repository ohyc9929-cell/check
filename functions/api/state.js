const TASK_COUNT = 24;

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
            .prepare("SELECT task_index, checked FROM checklist_state ORDER BY task_index")
            .all();

        if (
            results.length !== TASK_COUNT ||
            results.some((row, index) => row.task_index !== index)
        ) {
            console.error("Checklist database is missing initialized task rows.");
            return jsonResponse({ error: "공유 체크리스트가 아직 초기화되지 않았습니다." }, 503);
        }

        return jsonResponse({
            tasks: results.map(row => row.checked === 1)
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

    if (!update || typeof update !== "object" || Array.isArray(update)) {
        return jsonResponse({ error: "요청 형식이 올바르지 않습니다." }, 400);
    }

    try {
        const database = getDatabase(context);

        if (
            Number.isInteger(update.index) &&
            update.index >= 0 &&
            update.index < TASK_COUNT &&
            typeof update.checked === "boolean"
        ) {
            const result = await database
                .prepare("UPDATE checklist_state SET checked = ? WHERE task_index = ?")
                .bind(update.checked ? 1 : 0, update.index)
                .run();

            if (result.meta.changes !== 1) {
                return jsonResponse({ error: "공유 체크리스트가 아직 초기화되지 않았습니다." }, 503);
            }
        } else if (typeof update.all === "boolean") {
            await database
                .prepare("UPDATE checklist_state SET checked = ?")
                .bind(update.all ? 1 : 0)
                .run();
        } else {
            return jsonResponse({ error: "체크 항목 값이 올바르지 않습니다." }, 400);
        }

        return jsonResponse({ success: true });
    } catch (error) {
        console.error("Unable to save shared checklist.", error);
        return jsonResponse({ error: "공유 체크리스트를 저장하지 못했습니다." }, 503);
    }
}
