import {ResolverActionsConfig, WebhookCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

const defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(WebhookCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const webhookEnhanceConfig: ResolverActionsConfig<"Webhook"> = {
    ...defaultPerms
}
