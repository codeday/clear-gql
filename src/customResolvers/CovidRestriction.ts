import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {
    FindUniqueCovidRestrictionArgs,
    CovidRestriction,
    Sponsor,
    FindUniqueSponsorArgs
} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import dot from "dot-object";
import {FileUpload, GraphQLUpload} from "graphql-upload";
// @ts-ignore
import Uploader from '@codeday/uploader-node';
const uploader = new Uploader(process.env.UPLOADER_URL, process.env.UPLOADER_SECRET);


@Resolver(of => CovidRestriction)
export class CustomCovidRestrictionResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => CovidRestriction, {nullable: true})
    async uploadCovidRestrictionIcon(
        @Args() where: FindUniqueCovidRestrictionArgs,
        @Arg("upload", () => GraphQLUpload) { createReadStream, filename}: FileUpload,
        @Ctx() { prisma }: Context,
    ): Promise<CovidRestriction> {
        const chunks = [];
        for await (const chunk of createReadStream()) {
            chunks.push(chunk)
        }
        const uploadBuffer = Buffer.concat(chunks);

        const result = await uploader.image(uploadBuffer, filename || '_.jpg')
        if (!result.url) {
            throw new Error("An error occurred while uploading your picture. Please refresh the page and try again.")
        }
        return prisma.covidRestriction.update({...where, data: {iconUri: result.url}})    }
}

@Resolver(of => CovidRestriction)
export class CovidRestrictionMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() covidRestriction: CovidRestriction,
        @Arg("key") key: string,
    ): String | null {
        if (!covidRestriction.metadata) return null;
        const metadataObject = covidRestriction.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => CovidRestriction, {nullable: true})
    async setCovidRestrictionMetadata(
        @Args() args: FindUniqueCovidRestrictionArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<CovidRestriction | null> {
        const covidRestriction = await prisma.covidRestriction.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!covidRestriction) return null;
        const metadataObject = covidRestriction.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.covidRestriction.update({...args, data: {metadata: metadataObject}})
    }
}
