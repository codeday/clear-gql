import { Field, ObjectType } from 'type-graphql';
import { PublicPerson } from './PublicPerson';

@ObjectType()
export class Team {
  @Field(() => [PublicPerson])
  staff: PublicPerson[];

  @Field(() => [PublicPerson])
  mentors: PublicPerson[];

  @Field(() => String)
  judges: PublicPerson[];
}