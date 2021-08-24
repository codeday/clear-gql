import {FieldResolver, Resolver, Ctx, Root} from "type-graphql";
import {Person} from "../generated/typegraphql-prisma";

@Resolver(of => Person)
export class CustomPersonResolver {
    @FieldResolver(type => Boolean)
    needsGuardian(
        @Root() person: Person,
    ): Boolean {
        if (person.age && person.age >= 18) return false
        if (!person.guardian) return true
        return false
    }

}
