import { DateTime } from "luxon";
import { EventGroup } from "@prisma/client"
import { WebhookPayload } from './sendWebhook';
import { prisma } from '../services';

const MEDALS = ['🥇', '🥈', '🥉'];

export async function makeLeaderboard(eventGroup: EventGroup): Promise<WebhookPayload> {
    const now = DateTime.now()

    const openEvents = await prisma.event.findMany({
        where: {
            registrationsOpen: true,
            startDate: { gt: now.toJSDate() },
            eventGroup: { id: eventGroup.id },
        },
        select: {
            name: true,
            tickets: {where: {type : {equals: 'STUDENT'}}}
        }
    });

    if (openEvents.length === 0) return null;

    const title = `🏆 ${eventGroup.name} leaderboard for ${now.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}`;
    const message = openEvents
        .sort((a,b) => (a.tickets.length > b.tickets.length) ? -1 : 1)
        .map((event, idx) => {
            const registeredToday = event.tickets.filter(
                (ticket) => (DateTime.fromJSDate(ticket.createdAt).diffNow('hours').hours >= -24)
            ).length;
            const medal = (idx < MEDALS.length) ? `${MEDALS[idx]} ` : '       ';
            return `${medal}${event.name} ${event.tickets.length} (+${registeredToday})`
        })
        .join(`\n`);
    return { title, message };
}
