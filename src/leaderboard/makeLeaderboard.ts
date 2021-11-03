import { DateTime } from "luxon";
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

export default async function makeLeaderboard(): Promise<string> {
    const now = DateTime.now()
    let leaderboard = `🏆 Registration leaderboard for ${now.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}:\n`

    const openEvents = await prisma.event.findMany({
        where: {
            registrationsOpen: true,
            startDate: { gt: now.toJSDate() }
        },
        select: {
            name: true,
            tickets: {where: {type : {equals: 'STUDENT'}}}
        }
    })
    openEvents.sort((a,b) => (a.tickets.length > b.tickets.length) ? -1 : 1).forEach((event, idx) => {
        const registeredToday = event.tickets.filter(
            (ticket) => (DateTime.fromJSDate(ticket.createdAt).diffNow('hours').hours >= -24)
        ).length
        let medal;
        if (idx === 0) {
            medal = '🥇 '
        } else if (idx === 1) {
            medal = '🥈 '
        } else if (idx === 2) {
            medal = '🥉 '
        }
        leaderboard += `${medal || '       '}${event.name} ${event.tickets.length} (+${registeredToday})\n`
    })
    return leaderboard
}
