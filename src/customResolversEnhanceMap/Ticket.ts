import {ResolverActionsConfig, TicketCrudResolver} from "../generated/typegraphql-prisma";
import {Authorized} from "type-graphql";
import {AuthRole} from "../context";

let defaultPerms: {[key: string]: MethodDecorator[]} = {};
Object.getOwnPropertyNames(TicketCrudResolver.prototype).forEach((value: string) => defaultPerms[value] = [Authorized(AuthRole.ADMIN)])

export const ticketEnhanceConfig: ResolverActionsConfig<"Ticket"> = {
    ...defaultPerms,
    createTicket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    updateTicket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)],
    deleteTicket: [Authorized(AuthRole.ADMIN, AuthRole.MANAGER)]
}
