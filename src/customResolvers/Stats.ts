import { Resolver, Query, Ctx } from "type-graphql";
import { PrismaClient } from "@prisma/client";
import { TicketType } from "../generated/typegraphql-prisma";
import { Context } from "../context";
import { StatOutcomes, YearStatOutcomes } from "../types";
import { memoizeWithTtl } from "../utils";

const CACHE_TTL_MS = 60 * 60 * 1000;

function buildStatOutcomes(studentCount: number, volunteerCount: number): StatOutcomes {
    const studentHours = Math.round(studentCount * 24);
    const volunteerHours = Math.round(volunteerCount * 12);
    return {
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
    const [studentCount, ticketCount] = await Promise.all([
        prisma.ticket.count({ where: { type: TicketType.STUDENT } }),
        prisma.ticket.count(),
    ]);
    return buildStatOutcomes(studentCount, ticketCount - studentCount);
}
const getCachedStatOutcomes = memoizeWithTtl(computeStatOutcomes, CACHE_TTL_MS);

async function computeStatOutcomesByYear(prisma: PrismaClient): Promise<YearStatOutcomes[]> {
    const tickets = await prisma.ticket.findMany({
        select: { type: true, event: { select: { startDate: true } } },
    });

    const countsByYear = new Map<number, { studentCount: number, volunteerCount: number }>();
    tickets.forEach((ticket) => {
        const year = ticket.event.startDate.getFullYear();
        const counts = countsByYear.get(year) ?? { studentCount: 0, volunteerCount: 0 };
        if (ticket.type === TicketType.STUDENT) counts.studentCount += 1;
        else counts.volunteerCount += 1;
        countsByYear.set(year, counts);
    });

    return Array.from(countsByYear.entries())
        .sort(([yearA], [yearB]) => yearA - yearB)
        .map(([year, counts]) => ({
            year,
            statOutcomes: buildStatOutcomes(counts.studentCount, counts.volunteerCount),
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
