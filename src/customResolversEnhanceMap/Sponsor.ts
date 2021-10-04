import {ResolverActionsConfig, SponsorCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

const defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(SponsorCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const sponsorEnhanceConfig: ResolverActionsConfig<"Sponsor"> = {
    ...defaultPerms,
    createSponsor: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateSponsor: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteSponsor: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
}
