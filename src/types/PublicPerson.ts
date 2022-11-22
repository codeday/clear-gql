import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class PublicPerson {
  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String, { nullable: true })
  username: string | null;

  @Field(() => String)
  avatarUrl?: string;
}