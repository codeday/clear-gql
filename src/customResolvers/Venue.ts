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
  zipCode(@Root() venue: Venue): String | null {
    return venue.address ? addresser.parseAddress(venue.address).zipCode : null;
  }

  @FieldResolver((_returns) => String, { nullable: true })
  addressLine1(@Root() venue: Venue): String | null {
    return venue.address
      ? addresser.parseAddress(venue.address).addressLine1
      : null;
  }

  @FieldResolver((_returns) => String, { nullable: true })
  state(@Root() venue: Venue): String | null {
    return venue.address
      ? addresser.parseAddress(venue.address).stateName
      : null;
  }

  @FieldResolver((_returns) => String, { nullable: true })
  stateAbbreviation(@Root() venue: Venue): String | null {
    return venue.address
      ? addresser.parseAddress(venue.address).stateAbbreviation
      : null;
  }

  @FieldResolver((_returns) => String, { nullable: true })
  city(@Root() venue: Venue): String | null {
    return venue.address
      ? addresser.parseAddress(venue.address).placeName
      : null;
  }
}
