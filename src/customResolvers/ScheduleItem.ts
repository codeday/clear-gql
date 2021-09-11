import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args} from "type-graphql";
import {ScheduleItem, FindUniqueScheduleItemArgs} from "../generated/typegraphql-prisma";
import {Context} from "../context";
import dot from "dot-object";

@Resolver(of => ScheduleItem)
export class CustomScheduleItemResolver {
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
