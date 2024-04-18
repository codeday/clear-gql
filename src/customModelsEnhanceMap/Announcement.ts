import {AnnouncementScalarFieldEnum, ModelConfig} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.keys(AnnouncementScalarFieldEnum).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)])

export const announcementEnhanceConfig: ModelConfig<"Announcement"> = {
    fields: {
        ...defaultPerms,
        id: [],
        createdAt: [],
        updatedAt: [],
        content: [],
    }
}
