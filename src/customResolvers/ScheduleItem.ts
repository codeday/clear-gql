import { Prisma, PrismaClient } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {ScheduleItem, FindUniqueScheduleItemArgs} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import fetch from 'node-fetch';
import dot from "dot-object";
import { DateTime } from 'luxon';

function stripAmPm(str: string): string {
    return str.replace(' AM', '').replace(' PM', '');
}

type GetTimezoneQueryResponse = { data: { cms: { regions: { items: { timezone: string }[] } } } };
const GET_TIMEZONE_QUERY = `
query GetTimezoneQuery($webname: String!) {
  cms {
    regions(where:{webname:$webname}, limit:1) {
      items {
        timezone
      }
    }
  }
}
`;

// TODO(@tylermenezes): This is a bad solution to support server-side time formatting
async function getEventTimezone(prisma: PrismaClient, eventId?: string | null): Promise<string> {
    if (!eventId) return 'UTC';
    try {
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { contentfulWebname: true },
            rejectOnNotFound: true,
        });

        const res = await fetch('https://graph.codeday.org/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: GET_TIMEZONE_QUERY, variables: { webname: event.contentfulWebname } }),
        });
        const { data } = <GetTimezoneQueryResponse> await res.json();
        return data.cms.regions.items[0].timezone;
    } catch (ex) {
        return 'UTC';
    }
}

@Resolver(of => ScheduleItem)
export class CustomScheduleItemResolver {
    @FieldResolver(type => String)
    async displayTime(
        @Root() scheduleItem: ScheduleItem,
        @Ctx() { prisma }: Context,
    ): Promise<String> {
        const tz = await getEventTimezone(prisma, scheduleItem.eventId);

        const start = DateTime.fromJSDate(scheduleItem.start).setZone(tz);
        if (!scheduleItem.end) return start.toLocaleString({ hour: 'numeric', minute: 'numeric' });

        const end = DateTime.fromJSDate(scheduleItem.end).setZone(tz);

        const sameMeridiem = Math.sign(start.hour - 12) === Math.sign(end.hour - 12);
        return [
            sameMeridiem
                ? stripAmPm(start.toLocaleString(DateTime.TIME_SIMPLE))
                : start.toLocaleString(DateTime.TIME_SIMPLE),
            end.toLocaleString(DateTime.TIME_SIMPLE),
        ].join('-');
    }

    @FieldResolver(type => String)
    async displayTimeWithDate(
        @Root() scheduleItem: ScheduleItem,
        @Ctx() { prisma }: Context,
    ): Promise<String> {
        const tz = await getEventTimezone(prisma, scheduleItem.eventId);
        const dayFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
        const hourFormat = DateTime.TIME_SIMPLE;

        const start = DateTime.fromJSDate(scheduleItem.start).setZone(tz);
        if (!scheduleItem.end) return start.toLocaleString({ ...dayFormat, ...hourFormat })

        const end = DateTime.fromJSDate(scheduleItem.end).setZone(tz);
        const sameDay = start.day === end.day && start.month === end.month && start.year === end.year;
        const sameMeridiem = Math.sign(start.hour - 12) === Math.sign(end.hour - 12);

        if (sameDay) {
            return [
                sameMeridiem
                    ? stripAmPm(start.toLocaleString({ ...dayFormat, ...hourFormat }))
                    : start.toLocaleString({ ...dayFormat, ...hourFormat }),
                end.toLocaleString(hourFormat),
            ].join('-');
        }

        return [
            start.toLocaleString({ ...dayFormat, ...hourFormat }),
            end.toLocaleString({ ...dayFormat, ...hourFormat }),
        ].join('-');
    }
}

@Resolver(of => ScheduleItem)
export class ScheduleItemMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
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

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
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
