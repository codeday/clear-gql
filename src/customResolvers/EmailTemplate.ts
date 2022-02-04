import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {FindUniqueEmailTemplateArgs, EmailTemplate} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import dot from "dot-object";

@Resolver(of => EmailTemplate)
export class EmailTemplateMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() emailTemplate: EmailTemplate,
        @Arg("key") key: string,
    ): String | null {
        if (!emailTemplate.metadata) return null;
        const metadataObject = emailTemplate.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => EmailTemplate, {nullable: true})
    async setEmailTemplateMetadata(
        @Args() args: FindUniqueEmailTemplateArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<EmailTemplate | null> {
        const emailTemplate = await prisma.emailTemplate.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!emailTemplate) return null;
        const metadataObject = emailTemplate.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.emailTemplate.update({...args, data: {metadata: metadataObject}})
    }
}
