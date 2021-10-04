import {ResolverActionsConfig, VenueCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(VenueCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const venueEnhanceConfig: ResolverActionsConfig<"Venue"> = {
    ...defaultPerms,
    createVenue: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateVenue: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteVenue: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
}
