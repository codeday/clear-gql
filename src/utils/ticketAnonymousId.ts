import { createHmac } from 'crypto';
import { PrismaClient, Ticket as PrismaTicket } from '@prisma/client';
import { Ticket } from "../generated/typegraphql-prisma";
import config from '../config';

export async function ticketAnonymousId(ticket: Ticket | PrismaTicket, prisma: PrismaClient): Promise<string> {
    let hashId = ticket.id;
    if (ticket.email || ticket.phone) {
        const firstRegistration = await prisma.ticket.findFirst({
            where: {
                id: { not: ticket.id },
                OR: [
                    ...(ticket.email ? [{ email: ticket.email }] : []),
                    ...(ticket.phone ? [{ phone: ticket.phone }] : []),
                ],
                lastName: {
                    equals: ticket.lastName,
                    mode: 'insensitive',
                },
                firstName: {
                    equals: ticket.firstName,
                    mode: 'insensitive',
                },
            },
            orderBy: [{ createdAt: 'asc' }],
            select: { id: true },
        });
        if (firstRegistration) hashId = firstRegistration.id;
    }
    return createHmac('whirlpool', config.anonymous.secret)
        .update(hashId, 'utf-8')
        .digest('hex');
}