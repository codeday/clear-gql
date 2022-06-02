import { prisma } from '../services';
import { WebhookType } from "@prisma/client";
import { sendWebhook } from "./sendWebhook";
import { makeEventDigest } from './makeEventDigest';

export async function sendEventDigests(): Promise<void> {
    const eventWebhooks = await prisma.webhook.findMany({
      where: { NOT: { event: null }, type: WebhookType.DIGEST },
      include: { event: true },
    });

    for (const webhook of eventWebhooks) {
      await sendWebhook(webhook, await makeEventDigest(webhook.event!));
    }
}
