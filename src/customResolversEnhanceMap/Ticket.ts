import { ResolverActionsConfig, TicketCrudResolver } from "../generated/typegraphql-prisma";
import { Authorized } from "type-graphql";
import { AuthRole } from "../context";

let defaultPerms: { [key: string]: MethodDecorator[] } = {};
Object.getOwnPropertyNames(TicketCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const ticketEnhanceConfig: ResolverActionsConfig<"Ticket"> = {
    ...defaultPerms,
    ticket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    createOneTicket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateOneTicket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteOneTicket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)]
}
