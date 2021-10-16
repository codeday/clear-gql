import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Resolver, Root} from "type-graphql";
import {FindUniqueEventArgs, FindUniqueMailingListMemberArgs, MailingListMember} from "../generated/typegraphql-prisma";
import {Prisma} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";

@Resolver(of => MailingListMember)
export class CustomMailingListMemberResolver {

    @Mutation(_returns => MailingListMember, {nullable: true})
    async subscribeToMailingList(
        @Args() where: FindUniqueEventArgs,
        @Arg("email") email: string,
        @Ctx() { prisma }: Context
    ): Promise<MailingListMember | null> {
        const event = prisma.event.findUnique(where)
        await prisma.event.update({
            ...where,
            data: {
                interestedEmails: {
                    connectOrCreate: {
                        where: {
                            email: email
                        },
                        create: {
                            email: email
                        }
                    }
                }
            }
        })
        return prisma.mailingListMember.findUnique({where: {email: email}})
    }
}

@Resolver(of => MailingListMember)
export class MailingListMemberMetadataResolver {
    @Authorized(AuthRole.ADMIN)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() mailingListMember: MailingListMember,
        @Arg("key") key: string,

    ): String | null {
        if (!mailingListMember.metadata) return null;
        const metadataObject = mailingListMember.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => MailingListMember, {nullable: true})
    async setMailingListMemberMetadata(
        @Args() args: FindUniqueMailingListMemberArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<MailingListMember | null> {
        const mailingListMember = await prisma.mailingListMember.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!mailingListMember) return null;
        const metadataObject = mailingListMember.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.mailingListMember.update({...args, data: {metadata: metadataObject}})
    }
}
