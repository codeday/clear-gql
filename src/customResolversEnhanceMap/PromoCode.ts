import {PromoCodeCrudResolver, ResolverActionsConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(PromoCodeCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const promocodeEnhanceConfig: ResolverActionsConfig<"PromoCode"> = {
    ...defaultPerms,
    promoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    createPromoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updatePromoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deletePromoCode: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
}
