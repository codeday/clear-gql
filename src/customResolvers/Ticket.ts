import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized, Query} from "type-graphql";
import {FindUniqueTicketArgs, Person, Ticket} from "../generated/typegraphql-prisma";
import { Prisma } from "@prisma/client"
import dot from "dot-object";
import { sendWaiverReminder } from '../waivers';
import {AuthRole, Context} from "../context";
import { TicketLookupResult } from "../types";
import { ticketAnonymousId } from "../utils";
import { GraphQLJSONObject } from "graphql-scalars";
import { GraphQLScalarType } from "graphql";


@Resolver(of => Ticket)
export class CustomTicketResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => Boolean)
    needsGuardian(
        @Root() ticket: Ticket,
    ): Boolean {
        if (ticket.age && ticket.age >= 18) return false;
        if (ticket.personId) return false;
        return true
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String)
    async anonymousId(
        @Root() ticket: Ticket,
        @Ctx() { prisma }: Context,
    ): Promise<string> {
        return ticketAnonymousId(ticket, prisma);
    }

    @FieldResolver(() => GraphQLJSONObject, { nullable: true })
    getSurveyResponses(
        @Root() ticket: Ticket,
        @Arg('only', _type => [String], { nullable: true }) only: string[] | null,
        @Arg('exclude', _type => [String], { nullable: true }) exclude: string[] | null,
    ): Prisma.JsonObject | undefined {
        if (
            !ticket.surveyResponses
            || typeof ticket.surveyResponses !== 'object'
            || Array.isArray(ticket.surveyResponses)
        ) return undefined;

        let ret = ticket.surveyResponses;
        if (exclude) ret = Object.fromEntries(Object.entries(ret).filter(([k]) => !exclude.includes(k)));
        if (only) ret = Object.fromEntries(Object.entries(ret).filter(([k]) => only.includes(k)));
        return ret;
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Ticket, {nullable: true})
    async checkin(
        @Args() args: FindUniqueTicketArgs,
        @Ctx() { prisma }: Context,
    ): Promise<Ticket | null> {
        return (await prisma.ticket.update({
            ...args,
            data: {
                checkedIn: new Date(),
                checkedOut: null,
            }
        })) || null;
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Ticket, {nullable: true})
    async checkout(
        @Args() args: FindUniqueTicketArgs,
        @Ctx() { prisma }: Context,
    ): Promise<Ticket | null> {
        return (await prisma.ticket.update({
            ...args,
            data: {
                checkedOut: new Date(),
            }
        })) || null;
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Boolean, { nullable: true })
    async sendWaiverReminder(
        @Args() args: FindUniqueTicketArgs,
        @Arg('regenerate', () => Boolean, { defaultValue: false }) regenerate = false,
        @Ctx() { prisma }: Context,
    ): Promise<boolean> {
      const ticket = await prisma.ticket.findUnique({
        ...args,
        include: { event: true, guardian: true },
        rejectOnNotFound: true,
      });
      await sendWaiverReminder(ticket, regenerate);
      return true;
    }

    @Mutation(_returns => Boolean)
    async trackSurveyResponse(
        @Args() args: FindUniqueTicketArgs,
        @Arg('privateKey', () => String) privateKey: string,
        @Arg('key', () => String) key: string,
        @Arg('value', () => String) value: string,
        @Ctx() { prisma }: Context,
    ): Promise<boolean> {
        const ticket = await prisma.ticket.findFirst({
            where: { ...args.where, AND: [{ privateKey }, { NOT: { privateKey: null }}, { NOT: { privateKey: '' }}] },
            rejectOnNotFound: true,
            select: { surveyResponses: true },
        });
        const newSurveyResponses = { ...((ticket.surveyResponses || {}) as Prisma.JsonObject), [key]: value };
        await prisma.ticket.update({
            where: { ...args.where },
            data: { surveyResponses: newSurveyResponses },
        });
        return true;
    }

    @Query(_returns => TicketLookupResult)
    async retrieveTicketInfo(
        @Args() args: FindUniqueTicketArgs,
        @Arg('privateKey', () => String) privateKey: string,
        @Ctx() { prisma }: Context,
    ): Promise<TicketLookupResult> {
        const ticket = await prisma.ticket.findFirst({
            where: { ...args.where, AND: [{ privateKey }, { NOT: { privateKey: null }}, { NOT: { privateKey: '' }}] },
            rejectOnNotFound: true,
            include: { event: true, guardian: true, payment: true, promoCode: true },
        });
        const promo = ticket.promoCode;
        return {
            ...ticket,
            anonymousId: await ticketAnonymousId(ticket, prisma),
            promoCode: !promo ? null : {
                displayDiscountAmount: promo.type === 'PERCENT' ? promo.amount + '%' : '$' + promo.amount.toFixed(2),
                discountType: promo.type,
                discountAmount: promo.amount,
                displayDiscountName: promo.code.toUpperCase(),
                metadata: promo.metadata,
            }
        }
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Query(_returns => [Ticket])
    async ticketsWithSurveyKey(
        @Arg('keys', _type => [String]) keys: string[],
        @Arg('equals', _type => String, { nullable: true }) equals: string | null,
        @Arg('not', _type => String, { nullable: true }) not: string | null,
        @Ctx() { prisma }: Context,
    ): Promise<Ticket[]> {
        const filter: Pick<Prisma.JsonNullableFilter, 'not' | 'equals'> = (equals || not)
            ? { equals: equals ?? undefined, not: not ?? undefined }
            : { not: Prisma.AnyNull };

        return prisma.ticket.findMany({
            where: {
                OR: keys.map((k) => ({
                    surveyResponses: {
                        path: [k],
                        ...filter,
                    }
                })),
            }
        })
    }
}

@Resolver(of => Ticket)
export class TicketMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() ticket: Ticket ,
        @Arg("key") key: string,
    ): String | null {
        if (!ticket.metadata) return null;
        const metadataObject = ticket.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Ticket, {nullable: true})
    async setTicketMetadata(
        @Args() args: FindUniqueTicketArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Ticket | null> {
        const ticket = await prisma.ticket.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!ticket) return null;
        const metadataObject = ticket.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.ticket.update({...args, data: {metadata: metadataObject}})
    }
}
