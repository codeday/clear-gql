import {Arg, Args, Authorized, Ctx, FieldResolver, Mutation, Resolver, Root} from "type-graphql";
import {FindUniquePromoCodeArgs, PromoCode} from "../generated/typegraphql-prisma";
import {Prisma} from "@prisma/client";
import dot from "dot-object";
import {AuthRole, Context} from "../context";

@Resolver(of => PromoCode)
export class PromoCodeMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() promoCode: PromoCode,
        @Arg("key") key: string,
    ): String | null {
        if (!promoCode.metadata) return null;
        const metadataObject = promoCode.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => PromoCode, {nullable: true})
    async setEventMetadata(
        @Args() args: FindUniquePromoCodeArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<PromoCode | null> {
        const promoCode = await prisma.promoCode.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!promoCode) return null;
        const metadataObject = promoCode.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.promoCode.update({...args, data: {metadata: metadataObject}})
    }
}
