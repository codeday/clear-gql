import { Prisma } from "@prisma/client";
import {
  FieldResolver,
  Resolver,
  Ctx,
  Root,
  Arg,
  Mutation,
  Args,
  Authorized,
  Query,
} from "type-graphql";
import {
  FindUniqueVenueArgs,
  Venue,
  VenueWhereInput,
  VenueWhereUniqueInput,
} from "../generated/typegraphql-prisma";
import { AuthRole, Context } from "../context";
import dot from "dot-object";
import addresser from "addresser";

@Resolver((of) => Venue)
export class VenueMetadataResolver {
  @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
  @FieldResolver((type) => String, { nullable: true })
  getMetadata(@Root() venue: Venue, @Arg("key") key: string): String | null {
    if (!venue.metadata) return null;
    const metadataObject = venue.metadata as Prisma.JsonObject;
    const value = dot.pick(key, metadataObject);
    if (value) return value.toString();
    return null;
  }

  @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
  @Mutation((_returns) => Venue, { nullable: true })
  async setVenueMetadata(
    @Args() args: FindUniqueVenueArgs,
    @Arg("key") key: string,
    @Arg("value") value: string,
    @Ctx() { prisma }: Context
  ): Promise<Venue | null> {
    const venue = await prisma.venue.findUnique({
      ...args,
      select: {
        metadata: true,
      },
    });
    if (!venue) return null;
    const metadataObject = (venue.metadata as Prisma.JsonObject) || {};
    dot.str(key, value, metadataObject);
    return await prisma.venue.update({
      ...args,
      data: { metadata: metadataObject },
    });
  }
}

@Resolver((of) => Venue)
export class VenueAddressResolver {
  @FieldResolver((_returns) => String, { nullable: true })
  address(@Root() venue: Venue): String | null {
    return `${venue.addressLine1}
    ${venue.addressLine2? `\n ${venue.addressLine2}`: ``}
    ${venue.addressLine3? `\n ${venue.addressLine3}` : ``}
    \n ${venue.city || ``}${venue.state? `${venue.city? `, `: ``} ${venue.state}`: ``}
    ${venue.zipCode || ``}`
  }
  @FieldResolver((_returns) => String, { nullable: true })
  addressInline(@Root() venue: Venue): String | null {
    return [
      venue.addressLine1,
      venue.addressLine2,
      venue.addressLine3,
      [venue.city, venue.state].filter(Boolean).join(', ') + (venue.zipCode ? `  ${venue.zipCode}` : ''),
    ].filter(Boolean).join(', ');
  }

}
