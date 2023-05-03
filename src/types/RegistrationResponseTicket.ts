import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class RegistrationResponseTicket {
  @Field(() => String)
  id: string;

  @Field(() => String, { nullable: true })
  privateKey: string | null;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => Number, { nullable: true })
  age: number | null;
}