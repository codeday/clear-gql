import {CovidRestrictionCrudResolver, ResolverActionsConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(CovidRestrictionCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)])

export const covidrestrictionEnhanceConfig: ResolverActionsConfig<"CovidRestriction"> = {
    ...defaultPerms
}
