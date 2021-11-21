import makeLeaderboard from "./makeLeaderboard";
import webhook from "webhook-discord"

export default async function sendLeaderboard(WEBHOOK_URL: string): Promise<void> {
    const leaderboard = await makeLeaderboard();
    if (!leaderboard) return;

    const hook = new webhook.Webhook(WEBHOOK_URL);
    const msg = new webhook.MessageBuilder()
        .setName('Clear')
        .setText(leaderboard);
    await hook.send(msg);
}
