import { ResolverActionsConfig, SponsorCrudResolver } from "../generated/typegraphql-prisma";
import { Authorized } from "type-graphql";
import { AuthRole } from "../context";

const defaultPerms: { [key: string]: MethodDecorator[] } = {};
Object.getOwnPropertyNames(SponsorCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const sponsorEnhanceConfig: ResolverActionsConfig<"Sponsor"> = {
    ...defaultPerms,
    createOneSponsor: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateOneSponsor: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteOneSponsor: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
}
