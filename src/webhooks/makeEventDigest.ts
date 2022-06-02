import { DateTime } from "luxon";
import { Event, EventGroup, TicketType } from "@prisma/client"
import { WebhookPayload } from './sendWebhook';
import { prisma } from '../services';

export async function makeEventDigest(event: Event): Promise<WebhookPayload> {
    const now = DateTime.now()
    const tickets = await prisma.ticket.findMany({
        where: {
            type : TicketType.STUDENT,
            createdAt: {
              gt: now.minus({ days: 1 }).toJSDate(),
            },
        },
        select: {
            firstName: true,
            lastName: true,
        },
    });

    const title = `${tickets.length} new ${event.name} registrations on ${now.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}`;
    const message = tickets.length === 0
      ? '- No registrations today.'
      : tickets.map((ticket) => `- ${ticket.firstName} ${ticket.lastName[0]}`).join(`\n`);

   return { title, message };
}
