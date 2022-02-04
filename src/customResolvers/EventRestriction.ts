import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {
    FindUniqueEventRestrictionArgs,
    EventRestriction,
    Sponsor,
    FindUniqueSponsorArgs
} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import dot from "dot-object";
import {FileUpload, GraphQLUpload} from "graphql-upload";
// @ts-ignore
import Uploader from '@codeday/uploader-node';
const uploader = new Uploader(process.env.UPLOADER_URL, process.env.UPLOADER_SECRET);


@Resolver(of => EventRestriction)
export class CustomEventRestrictionResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => EventRestriction, {nullable: true})
    async uploadEventRestrictionIcon(
        @Args() where: FindUniqueEventRestrictionArgs,
        @Arg("upload", () => GraphQLUpload) { createReadStream, filename}: FileUpload,
        @Ctx() { prisma }: Context,
    ): Promise<EventRestriction> {
        const chunks = [];
        for await (const chunk of createReadStream()) {
            chunks.push(chunk)
        }
        const uploadBuffer = Buffer.concat(chunks);

        const result = await uploader.image(uploadBuffer, filename || '_.jpg')
        if (!result.url) {
            throw new Error("An error occurred while uploading your picture. Please refresh the page and try again.")
        }
        return prisma.eventRestriction.update({...where, data: {iconUri: result.url}})    }
}

@Resolver(of => EventRestriction)
export class EventRestrictionMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() eventRestriction: EventRestriction,
        @Arg("key") key: string,
    ): String | null {
        if (!eventRestriction.metadata) return null;
        const metadataObject = eventRestriction.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => EventRestriction, {nullable: true})
    async setEventRestrictionMetadata(
        @Args() args: FindUniqueEventRestrictionArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<EventRestriction | null> {
        const eventRestriction = await prisma.eventRestriction.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!eventRestriction) return null;
        const metadataObject = eventRestriction.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.eventRestriction.update({...args, data: {metadata: metadataObject}})
    }
}
