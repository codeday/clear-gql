import {ResolverActionsConfig, PaymentCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

const defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(PaymentCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const paymentEnhanceConfig: ResolverActionsConfig<"Payment"> = {
    ...defaultPerms
}
