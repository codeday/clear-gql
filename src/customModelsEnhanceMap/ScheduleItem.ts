import {ScheduleItemScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(ScheduleItemScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)] )

export const scheduleitemEnhanceConfig: ModelConfig<"ScheduleItem"> = {
    fields: {
        ...defaultPerms,
        id: [],
        name: [],
        start: [],
        end: [],
        hostName: [],
        hostPronoun: [],
        description: [],
        link: [],
        type: [],
        finalized: [],
        internal: [],
    }
}
