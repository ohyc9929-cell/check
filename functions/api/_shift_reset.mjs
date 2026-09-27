const SHIFT_RESET_MINUTES = {
    open: 6 * 60,
    middle: 11 * 60,
    close: 17 * 60
};

const SEOUL_TIME_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
});

export function getDueShiftResets(now = new Date()) {
    const parts = Object.fromEntries(
        SEOUL_TIME_FORMATTER.formatToParts(now)
            .filter(part => part.type !== "literal")
            .map(part => [part.type, part.value])
    );
    const resetDate = `${parts.year}-${parts.month}-${parts.day}`;
    const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute);
    const groups = Object.entries(SHIFT_RESET_MINUTES)
        .filter(([, resetMinutes]) => currentMinutes >= resetMinutes)
        .map(([group]) => group);

    return { resetDate, groups };
}

export async function resetDueShiftGroups(database, now = new Date()) {
    const { resetDate, groups } = getDueShiftResets(now);

    await Promise.all(groups.map(group =>
        database
            .prepare("INSERT INTO checklist_group_reset_dates (group_name, reset_date) VALUES (?, ?) ON CONFLICT(group_name) DO UPDATE SET reset_date = excluded.reset_date WHERE checklist_group_reset_dates.reset_date < excluded.reset_date")
            .bind(group, resetDate)
            .run()
    ));
}
