import { makeLeaderboard } from "./makeLeaderboard";
import { prisma } from '../services';
import { WebhookType } from "@prisma/client";
import { sendWebhook } from "./sendWebhook";

export async function sendEventGroupDigests(): Promise<void> {
    const eventGroupWebhooks = await prisma.webhook.findMany({
      where: { NOT: { eventGroup: null }, type: WebhookType.DIGEST },
      include: { eventGroup: true },
    });

    for (const webhook of eventGroupWebhooks) {
      await sendWebhook(webhook, await makeLeaderboard(webhook.eventGroup!));
    }
}
