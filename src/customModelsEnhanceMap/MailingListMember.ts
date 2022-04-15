import {MailingListMemberScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(MailingListMemberScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)] )

export const mailinglistmemberEnhanceConfig: ModelConfig<"MailingListMember"> = {
    fields: {
        ...defaultPerms,
        id: []
    }
}
