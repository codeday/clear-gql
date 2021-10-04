import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {FindUniquePersonArgs, Person} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import dot from "dot-object";

@Resolver(of => Person)
export class PersonMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() person: Person,
        @Arg("key") key: string,
    ): String | null {
        if (!person.metadata) return null;
        const metadataObject = person.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Person, {nullable: true})
    async setPersonMetadata(
        @Args() args: FindUniquePersonArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Person | null> {
        const person = await prisma.person.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!person) return null;
        const metadataObject = person.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.person.update({...args, data: {metadata: metadataObject}})
    }
}
