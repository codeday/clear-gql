import {EventCrudResolver, ResolverActionsConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(EventCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const eventEnhanceConfig: ResolverActionsConfig<"Event"> = {
    ...defaultPerms,
    events: [],
    event: [],
    updateEvent: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    findFirstEvent: [],
}
