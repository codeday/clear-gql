import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {EventGroup, FindUniqueEventGroupArgs} from "../generated/typegraphql-prisma";
import moment from 'moment'
import {Prisma} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";

@Resolver(of => EventGroup)
export class CustomEventGroupResolver {
    @FieldResolver(type => String)
    displayDate(
        @Root() group: EventGroup,
    ): String {
        const startDate = moment(group.startDate).utc()
        const endDate = moment(group.endDate).utc()
        if (startDate.month() === endDate.month()) {
            return `${startDate.format('MMM Do')}-${endDate.format('Do YYYY')}`
        } else {
            return `${startDate.format('MMM Do')}-${endDate.format('MMM Do YYYY')}`
        }
    }
}
@Resolver(of => EventGroup)
export class EventGroupMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() eventGroup: EventGroup,
        @Arg("key") key: string,
    ): String | null {
        if (!eventGroup.metadata) return null;
        const metadataObject = eventGroup.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => EventGroup, {nullable: true})
    async setEventGroupMetadata(
        @Args() args: FindUniqueEventGroupArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<EventGroup | null> {
        const eventGroup = await prisma.eventGroup.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!eventGroup) return null;
        const metadataObject = eventGroup.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.eventGroup.update({...args, data: {metadata: metadataObject}})
    }
}
