import {EmailTemplateCrudResolver, ResolverActionsConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(EmailTemplateCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const emailtemplateEnhanceConfig: ResolverActionsConfig<"EmailTemplate"> = {
    ...defaultPerms
}
