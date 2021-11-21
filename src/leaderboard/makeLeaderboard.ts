import { DateTime } from "luxon";
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function makeLeaderboard(): Promise<string | null> {
    const now = DateTime.now()

    const openEvents = await prisma.event.findMany({
        where: {
            registrationsOpen: true,
            startDate: { gt: now.toJSDate() }
        },
        select: {
            name: true,
            tickets: {where: {type : {equals: 'STUDENT'}}}
        }
    });

    if (openEvents.length === 0) return null;

    const leaderboardHead = `🏆 Registration leaderboard for ${now.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}:\n`;
    const leaderboard = openEvents
        .sort((a,b) => (a.tickets.length > b.tickets.length) ? -1 : 1)
        .map((event, idx) => {
            const registeredToday = event.tickets.filter(
                (ticket) => (DateTime.fromJSDate(ticket.createdAt).diffNow('hours').hours >= -24)
            ).length;
            const medal = (idx < MEDALS.length) ? `${MEDALS[idx]} ` : '       ';
            return `${medal}${event.name} ${event.tickets.length} (+${registeredToday})`
        })
        .join(`\n`);
    return leaderboardHead + leaderboard;
}
