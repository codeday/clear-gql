import {ResolverActionsConfig, VenueCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(VenueCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const venueEnhanceConfig: ResolverActionsConfig<"Venue"> = {
    ...defaultPerms,
    createOneVenue: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateOneVenue: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteOneVenue: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
}
