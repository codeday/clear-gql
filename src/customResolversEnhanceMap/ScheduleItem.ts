import { ResolverActionsConfig, ScheduleItemCrudResolver } from "../generated/typegraphql-prisma";
import { Authorized } from "type-graphql";
import { AuthRole } from "../context";

const defaultPerms: { [key: string]: MethodDecorator[] } = {};
Object.getOwnPropertyNames(ScheduleItemCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const scheduleitemEnhanceConfig: ResolverActionsConfig<"ScheduleItem"> = {
    ...defaultPerms,
    scheduleItems: [],
    scheduleItem: [],
    createOneScheduleItem: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateOneScheduleItem: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteOneScheduleItem: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)]
}
