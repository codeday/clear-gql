import { ResolverActionsConfig, AnnouncementCrudResolver } from "../generated/typegraphql-prisma";
import { Authorized } from "type-graphql";
import { AuthRole } from "../context";

let defaultPerms: { [key: string]: MethodDecorator[] } = {};
Object.getOwnPropertyNames(AnnouncementCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const announcementEnhanceConfig: ResolverActionsConfig<"Announcement"> = {
    ...defaultPerms,
    createOneAnnouncement: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateOneAnnouncement: [Authorized(AuthRole.ADMIN)],
    deleteOneAnnouncement: [Authorized(AuthRole.ADMIN)],
}
