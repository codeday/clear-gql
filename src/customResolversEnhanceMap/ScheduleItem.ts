import {ResolverActionsConfig, ScheduleItemCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

const defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(ScheduleItemCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const scheduleitemEnhanceConfig: ResolverActionsConfig<"ScheduleItem"> = {
    ...defaultPerms,
    scheduleItems: [],
    scheduleItem: [],
    createScheduleItem: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateScheduleItem: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteScheduleItem: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)]
}
