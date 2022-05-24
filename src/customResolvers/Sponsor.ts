import {Prisma} from "@prisma/client"
import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Resolver, Root} from "type-graphql";
import {FindUniqueSponsorArgs, Sponsor} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import { uploader } from '../services';
import dot from "dot-object";

@Resolver(of => Sponsor)
export class CustomSponsorResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Sponsor, {nullable: true})
    async uploadSponsorLogo(
        @Args() where: FindUniqueSponsorArgs,
        @Arg("upload", () => GraphQLUpload) { createReadStream, filename }: FileUpload,
        @Ctx() { prisma }: Context,
    ): Promise<Sponsor> {
        const chunks = [];
        for await (const chunk of createReadStream()) {
            chunks.push(chunk)
        }
        const uploadBuffer = Buffer.concat(chunks);

        const result = await uploader.image(uploadBuffer, filename || '_.jpg')
        if (!result.url) {
            throw new Error("An error occurred while uploading your picture. Please refresh the page and try again.")
        }
        return prisma.sponsor.update({...where, data: {logoImageUri: result.url}})
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Sponsor, {nullable: true})
    async uploadDarkSponsorLogo(
        @Args() where: FindUniqueSponsorArgs,
        @Arg("upload", () => GraphQLUpload) { createReadStream, filename }: FileUpload,
        @Ctx() { prisma }: Context,
    ): Promise<Sponsor> {
        const chunks = [];
        for await (const chunk of createReadStream()) {
            chunks.push(chunk)
        }
        const uploadBuffer = Buffer.concat(chunks);

        const result = await uploader.image(uploadBuffer, filename || '_.jpg')
        if (!result.url) {
            throw new Error("An error occurred while uploading your picture. Please refresh the page and try again.")
        }
        return prisma.sponsor.update({...where, data: {darkLogoImageUri: result.url}})
    }
}
@Resolver(of => Sponsor)
export class SponsorMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
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

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
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
