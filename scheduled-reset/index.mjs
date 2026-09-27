import { resetDueShiftGroups } from "../functions/api/_shift_reset.mjs";

export default {
    async scheduled(controller, env) {
        if (!env.DB) {
            throw new Error("Cloudflare D1 binding DB is not configured.");
        }

        await resetDueShiftGroups(env.DB, new Date(controller.scheduledTime));
    }
};
