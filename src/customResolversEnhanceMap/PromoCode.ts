import { PromoCodeCrudResolver, ResolverActionsConfig } from "../generated/typegraphql-prisma";
import { Authorized } from "type-graphql";
import { AuthRole } from "../context";

let defaultPerms: { [key: string]: MethodDecorator[] } = {};
Object.getOwnPropertyNames(PromoCodeCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const promocodeEnhanceConfig: ResolverActionsConfig<"PromoCode"> = {
    ...defaultPerms,
    promoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    createOnePromoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateOnePromoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteOnePromoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
}
