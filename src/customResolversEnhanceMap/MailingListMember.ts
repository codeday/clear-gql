import {MailingListMemberCrudResolver, ResolverActionsConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(MailingListMemberCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const mailinglistmemberEnhanceConfig: ResolverActionsConfig<"MailingListMember"> = {
    ...defaultPerms,
}
