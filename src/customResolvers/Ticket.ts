import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args} from "type-graphql";
import {FindUniqueTicketArgs, Ticket} from "../generated/typegraphql-prisma";
import { Prisma } from "@prisma/client"
import {Context} from "../context";


@Resolver(of => Ticket)
export class CustomTicketResolver {
    @FieldResolver(type => Boolean)
    needsGuardian(
        @Root() ticket: Ticket,
    ): Boolean {
        if (ticket.age && ticket.age >= 18) return false;
        if (ticket.guardian) return false;
        return true
    }
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
