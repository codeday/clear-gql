import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root} from "type-graphql";
import {Event, FindUniqueEventArgs, FindManyEventArgs} from "../generated/typegraphql-prisma";
import moment from 'moment'
import {Prisma} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";

@Resolver(of => Event)
export class CustomEventResolver {
    @FieldResolver(type => String)
    displayDate(
        @Root() event: Event,
    ): String {
        const startDate = moment(event.startDate).utc()
        const endDate = moment(event.endDate).utc()
        if (startDate.month() === endDate.month()) {
            return `${startDate.format('MMM Do')}-${endDate.format('Do YYYY')}`
        } else {
            return `${startDate.format('MMM Do')}-${endDate.format('MMM Do YYYY')}`
        }
    }

    @FieldResolver(type => Boolean)
    canRegister(
        @Root() event: Event,
    ): Boolean {
        const closeDate = moment(event.registrationCutoff).utc()
        const now = moment().utc()
        return closeDate.isSameOrAfter(now) && event.registrationsOpen
    }

    @FieldResolver(type => Boolean)
    canEarlyBirdRegister(
        @Root() event: Event,
    ): Boolean {
        const earlyBirdCloseDate = moment(event.earlyBirdCutoff).utc()
        const now = moment().utc()
        return earlyBirdCloseDate.isSameOrAfter(now) && this.canRegister(event)
    }

    @FieldResolver(type => Number, {nullable: true})
    activeTicketPrice(
        @Root() event: Event,
    ): Number | null {
        if (this.canEarlyBirdRegister(event)) return event.earlyBirdPrice
        if (this.canRegister(event)) return event.ticketPrice
        return null
    }

    @Query(_returns => [Event])
    async events(
        @Args() args: FindManyEventArgs,
        @Ctx() {prisma, auth}: Context,
        @Arg('editable', () => Boolean, {nullable: true}) editable?: Boolean,
    ) : Promise<Event[]> {
        if(auth.username && editable) return await prisma.event.findMany({where: {managers: {has: auth.username || null}}})
        return await prisma.event.findMany({...args})
    }
}

@Resolver(of => Event)
export class EventMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() event: Event,
        @Arg("key") key: string,

    ): String | null {
        if (!event.metadata) return null;
        const metadataObject = event.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Event, {nullable: true})
    async setEventMetadata(
        @Args() args: FindUniqueEventArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Event | null> {
        const event = await prisma.event.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!event) return null;
        const metadataObject = event.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.event.update({...args, data: {metadata: metadataObject}})
    }
}
