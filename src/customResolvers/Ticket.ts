import {FieldResolver, Resolver, Ctx, Root} from "type-graphql";
import {Ticket} from "../generated/typegraphql-prisma";

@Resolver(of => Ticket)
export class CustomTicketResolver {
    @FieldResolver(type => Boolean)
    needsGuardian(
        @Root() ticket: Ticket,
    ): Boolean {
        if (ticket.age && ticket.age >= 18) return false;
        if (ticket.guardian) return false;
        return true
    }

}
