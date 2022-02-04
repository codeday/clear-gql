import {EmailTemplateScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(EmailTemplateScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)] )

export const emailTemplateEnhanceConfig: ModelConfig<"EmailTemplate"> = {
    fields: {
        ...defaultPerms,
    }
}
