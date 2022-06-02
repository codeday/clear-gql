import { Webhook as DiscordWebhook, MessageBuilder as DiscordMessageBuilder } from "webhook-discord";
import { WebhookService, Webhook } from '@prisma/client';
import { postmark } from '../services';

export type WebhookPayload = { title: string, message: string, redundantTitle?: boolean } | null;

export async function sendWebhook(webhook: Webhook, payload: WebhookPayload): Promise<void> {
  if (payload === null) return;

  try {
    if (webhook.service === WebhookService.DISCORD) {
      const titleStr = payload.redundantTitle ? '' : `**${payload.title}**\n`;
      await (new DiscordWebhook(webhook.sink)).send(
        (new DiscordMessageBuilder()).setName('Clear').setText(`${titleStr}${payload.message}`)
      );
    } else if (webhook.service === WebhookService.EMAIL) {
      await postmark.sendEmail({
        To: webhook.sink,
        From: 'clear@codeday.org',
        Subject: payload.title,
        TextBody: payload.message,
      });
    }
  } catch (ex) { console.error(ex); }
}
