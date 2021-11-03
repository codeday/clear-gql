import schedule from "node-schedule";
import sendLeaderboard from "./sendLeaderboard";

export default async function leaderboard(): Promise<void> {
    const WEBHOOK_URL = process.env.DISCORD_ORGANIZER_CHANNEL_WEBHOOK
    if (WEBHOOK_URL) {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 9;
        rule.tz = 'America/Los_Angeles';
        schedule.scheduleJob(rule, () => (sendLeaderboard(WEBHOOK_URL)));
    } else {
        console.log('No organizer channel webhook provided, daily leaderboard will not be sent')
    }
}
