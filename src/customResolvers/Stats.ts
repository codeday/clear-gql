import { Resolver, Query, Ctx } from "type-graphql";
import { PrismaClient } from "@prisma/client";
import { TicketType } from "../generated/typegraphql-prisma";
import { Context } from "../context";
import { StatOutcomes, YearStatOutcomes } from "../types";
import { memoizeWithTtl } from "../utils";

const CACHE_TTL_MS = 60 * 60 * 1000;

function buildStatOutcomes(eventCount: number, studentCount: number, volunteerCount: number): StatOutcomes {
    const studentHours = Math.round(studentCount * 24);
    const volunteerHours = Math.round(volunteerCount * 12);
    return {
        eventCount,
        studentCount,
        volunteerCount,
        projectCount: Math.round(studentCount / 1.7),
        prCount: 0,
        studentHours,
        volunteerHours,
        hours: Math.round(studentHours + volunteerHours),
    };
}

async function computeStatOutcomes(prisma: PrismaClient): Promise<StatOutcomes> {
    const [eventCount, studentCount, ticketCount] = await Promise.all([
        prisma.event.count(),
        prisma.ticket.count({ where: { type: TicketType.STUDENT } }),
        prisma.ticket.count(),
    ]);
    return buildStatOutcomes(eventCount, studentCount, ticketCount - studentCount);
}
const getCachedStatOutcomes = memoizeWithTtl(computeStatOutcomes, CACHE_TTL_MS);

async function computeStatOutcomesByYear(prisma: PrismaClient): Promise<YearStatOutcomes[]> {
    const [events, tickets] = await Promise.all([
        prisma.event.findMany({ select: { startDate: true } }),
        prisma.ticket.findMany({ select: { type: true, event: { select: { startDate: true } } } }),
    ]);

    const countsByYear = new Map<number, { eventCount: number, studentCount: number, volunteerCount: number }>();
    const getYearCounts = (year: number) => {
        const counts = countsByYear.get(year) ?? { eventCount: 0, studentCount: 0, volunteerCount: 0 };
        countsByYear.set(year, counts);
        return counts;
    };

    events.forEach((event) => {
        getYearCounts(event.startDate.getFullYear()).eventCount += 1;
    });
    tickets.forEach((ticket) => {
        const counts = getYearCounts(ticket.event.startDate.getFullYear());
        if (ticket.type === TicketType.STUDENT) counts.studentCount += 1;
        else counts.volunteerCount += 1;
    });

    return Array.from(countsByYear.entries())
        .sort(([yearA], [yearB]) => yearA - yearB)
        .map(([year, counts]) => ({
            year,
            statOutcomes: buildStatOutcomes(counts.eventCount, counts.studentCount, counts.volunteerCount),
        }));
}
const getCachedStatOutcomesByYear = memoizeWithTtl(computeStatOutcomesByYear, CACHE_TTL_MS);

@Resolver()
export class StatsResolver {
    @Query(_returns => StatOutcomes)
    async statOutcomes(
        @Ctx() { prisma }: Context,
    ): Promise<StatOutcomes> {
        return getCachedStatOutcomes(prisma);
    }

    @Query(_returns => [YearStatOutcomes])
    async statOutcomesByYear(
        @Ctx() { prisma }: Context,
    ): Promise<YearStatOutcomes[]> {
        return getCachedStatOutcomesByYear(prisma);
    }
}
