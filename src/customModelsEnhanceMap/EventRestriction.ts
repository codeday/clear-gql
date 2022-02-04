import {EventRestrictionScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(EventRestrictionScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)] )

export const eventRestrictionEnhanceConfig: ModelConfig<"EventRestriction"> = {
    fields: {
        ...defaultPerms,
        id: [],
        iconUri: [],
        title: [],
        details: [],
    }
}
