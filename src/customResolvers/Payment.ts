import { Prisma } from "@prisma/client"
import {FieldResolver, Resolver, Ctx, Root, Arg, Mutation, Args, Authorized} from "type-graphql";
import {FindUniquePaymentArgs, Payment} from "../generated/typegraphql-prisma";
import {AuthRole, Context} from "../context";
import dot from "dot-object";

@Resolver(of => Payment)
export class PaymentMetadataResolver {
    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @FieldResolver(type => String, {nullable: true})
    getMetadata(
        @Root() payment: Payment,
        @Arg("key") key: string,
    ): String | null {
        if (!payment.metadata) return null;
        const metadataObject = payment.metadata as Prisma.JsonObject;
        const value = dot.pick(key, metadataObject)
        if(value) return value.toString()
        return null
    }

    @Authorized(AuthRole.ADMIN, AuthRole.MANAGER)
    @Mutation(_returns => Payment, {nullable: true})
    async setPaymentMetadata(
        @Args() args: FindUniquePaymentArgs,
        @Arg("key") key: string,
        @Arg("value") value: string,
        @Ctx() { prisma }: Context,
    ): Promise<Payment | null> {
        const payment = await prisma.payment.findUnique({
            ...args,
            select: {
                metadata: true
            }
        });
        if (!payment) return null;
        const metadataObject = payment.metadata as Prisma.JsonObject || {}
        dot.str(key, value, metadataObject)
        return await prisma.payment.update({...args, data: {metadata: metadataObject}})
    }
}
