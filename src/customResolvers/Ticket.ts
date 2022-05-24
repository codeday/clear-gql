import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {FindUniqueTicketArgs, Person, Ticket} from "../generated/typegraphql-prisma";
import { Prisma } from "@prisma/client"
import dot from "dot-object";
import { sendWaiverReminder } from '../waivers';
import {AuthRole, Context} from "../context";


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
        @Ctx() { prisma }: Context,
    ): Promise<boolean> {
      const ticket = await prisma.ticket.findUnique({
        ...args,
        include: { event: true, guardian: true },
        rejectOnNotFound: true,
      });
      await sendWaiverReminder(ticket);
      return true;
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
