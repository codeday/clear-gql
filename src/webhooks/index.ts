import { Event, Ticket, WebhookType } from "@prisma/client";
import schedule from "node-schedule";
import { prisma } from "../services";
import { sendEventDigests } from "./sendEventDigests";
import { sendEventGroupDigests } from "./sendEventGroupDigests";
import { sendWebhook } from "./sendWebhook";
import { eventConfigWatchdog } from "./eventConfigWatchdog";

export async function automaticDigests(): Promise<void> {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 9;
    rule.minute = 0;
    rule.second = 0;
    rule.tz = 'America/Los_Angeles';
    schedule.scheduleJob(rule, () => {
      sendEventDigests();
      sendEventGroupDigests();
      eventConfigWatchdog();
    });
}

export async function sendTicketWebhook(ticket: Ticket & { event: Event }): Promise<void> {
    const webhooks = await prisma.webhook.findMany({
        where: {
          OR: [{ eventId: ticket.eventId }, { eventGroupId: ticket.event.eventGroupId }],
          type: WebhookType.ALL,
        },
    });

    for (const webhook of webhooks) {
      await sendWebhook(webhook, {
        title: `New ${ticket.event.name} Registration`,
        message: `${ticket.firstName} ${ticket.lastName[0]} registered for ${ticket.event.name}`,
        redundantTitle: true,
      });
    }
}
