import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args} from "type-graphql";
import {FindUniqueVenueArgs, Venue, VenueWhereInput, VenueWhereUniqueInput} from "../generated/typegraphql-prisma";
import {Context} from "../context";

@Resolver(of => Venue)
export class CustomVenueResolver {
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() venue: Venue,
        @Arg("key") key: string,
        @Ctx() { prisma }: Context,
        ): String | null {
        if (!venue.metadata) return null;
        const metadataObject = venue.metadata as Prisma.JsonObject;
        const value = metadataObject[key]
        if(value) return value.toString()
        return null
    }
    @Mutation(_returns => Venue, {nullable: true})
    async setVenueMetadata(
        @Args() args: FindUniqueVenueArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Venue | null> {
        const venue = await prisma.venue.findUnique({
            ...args
        });
        if (!venue) return null;
        const metadataObject = venue.metadata as Prisma.JsonObject || {}
        metadataObject[key] = value
        return await prisma.venue.update({...args, data: {metadata: metadataObject}})
    }
}
