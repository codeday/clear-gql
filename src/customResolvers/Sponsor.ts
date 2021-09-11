import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args} from "type-graphql";
import {FindUniqueSponsorArgs, Sponsor} from "../generated/typegraphql-prisma";
import {Context} from "../context";
import dot from "dot-object";

@Resolver(of => Sponsor)
export class CustomSponsorResolver {
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() sponsor: Sponsor,
        @Arg("key") key: string,
    ): String | null {
        if (!sponsor.metadata) return null;
        const metadataObject = sponsor.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }
    @Mutation(_returns => Sponsor, {nullable: true})
    async setSponsorMetadata(
        @Args() args: FindUniqueSponsorArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Sponsor | null> {
        const sponsor = await prisma.sponsor.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!sponsor) return null;
        const metadataObject = sponsor.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.sponsor.update({...args, data: {metadata: metadataObject}})
    }
}
