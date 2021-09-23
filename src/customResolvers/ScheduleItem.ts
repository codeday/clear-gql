import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args} from "type-graphql";
import {ScheduleItem, FindUniqueScheduleItemArgs} from "../generated/typegraphql-prisma";
import {Context} from "../context";
import dot from "dot-object";
import moment from "moment";

@Resolver(of => ScheduleItem)
export class CustomScheduleItemResolver {
    @FieldResolver(type => String)
    displayTime(
        @Root() scheduleItem: ScheduleItem,
        ): String {
        const start = moment(scheduleItem.start)
        if (!scheduleItem.end) return start.format('h:mma')
        const end = moment(scheduleItem.end)
        if (start.format('a') === end.format('a')) return `${start.format('hh:mm')} - ${end.format('hh:mma')}`
        return `${start.format('hh:mma')} - ${end.format('hh:mma')}`
    }

    @FieldResolver(type => String)
    displayTimeWithDate(
        @Root() scheduleItem: ScheduleItem,
        ): String {
        const start = moment(scheduleItem.start)
        if (!scheduleItem.end) return start.format('MMM Do hh:mma')
        const end = moment(scheduleItem.end)
        if (start.month() !== end.month()) return `${start.format('MMM Do hh:mma')} - ${end.format('MMM Do hh:mma')}`
        if (start.day() !== end.day()) return `${start.format('MMM Do hh:mma')} - ${end.format('Do hh:mma')}`
        if (start.format('a') !== end.format('a')) return `${start.format('MMM Do hh:mma')} - ${end.format('hh:mma')}`
        return `${start.format('MMM Do hh:mm')} - ${end.format('hh:mma')}`
    }
}

@Resolver(of => ScheduleItem)
export class ScheduleItemMetadataResolver {
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() scheduleItem: ScheduleItem,
        @Arg("key") key: string,
    ): String | null {
        if (!scheduleItem.metadata) return null;
        const metadataObject = scheduleItem.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }
    @Mutation(_returns => ScheduleItem, {nullable: true})
    async setScheduleItemMetadata(
        @Args() args: FindUniqueScheduleItemArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<ScheduleItem | null> {
        const scheduleItem = await prisma.scheduleItem.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!scheduleItem) return null;
        const metadataObject = scheduleItem.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.scheduleItem.update({...args, data: {metadata: metadataObject}})
    }
}
