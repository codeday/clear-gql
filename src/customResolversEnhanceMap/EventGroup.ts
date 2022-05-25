import {EventGroupCrudResolver, ResolverActionsConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(EventGroupCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const eventgroupEnhanceConfig: ResolverActionsConfig<"EventGroup"> = {
    ...defaultPerms,
    eventGroups: [],
    eventGroup: [],
}
