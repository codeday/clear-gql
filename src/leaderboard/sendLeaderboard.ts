import makeLeaderboard from "./makeLeaderboard";
import webhook from "webhook-discord"

export default async function sendLeaderboard(WEBHOOK_URL: string): Promise<void> {
    const hook = new webhook.Webhook(WEBHOOK_URL)
    const msg = new webhook.MessageBuilder()
        .setName('Clear')
        .setText(await makeLeaderboard())
    await hook.send(msg)
}
