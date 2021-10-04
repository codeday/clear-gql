import {ResolverActionsConfig, PersonCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

const defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(PersonCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const personEnhanceConfig: ResolverActionsConfig<"Person"> = {
    ...defaultPerms
}
