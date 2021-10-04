import {PaymentScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(PaymentScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)] )

export const paymentEnhanceConfig: ModelConfig<"Payment"> = {
    fields: {
        ...defaultPerms,
        id: [],
    }
}
