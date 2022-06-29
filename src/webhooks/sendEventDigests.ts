import { prisma } from '../services';
import { WebhookType } from "@prisma/client";
import { sendWebhook } from "./sendWebhook";
import { makeEventDigest } from './makeEventDigest';
import { DateTime } from 'luxon';

export async function sendEventDigests(): Promise<void> {
    const eventWebhooks = await prisma.webhook.findMany({
      where: {
        NOT: { event: null },
        type: WebhookType.DIGEST,
        event: {
          registrationsOpen: true,
          startDate: { gt: DateTime.now().toJSDate() },
        }
      },
      include: { event: true },
    });

    for (const webhook of eventWebhooks) {
      await sendWebhook(webhook, await makeEventDigest(webhook.event!));
    }
}
