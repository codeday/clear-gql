import { Field, Int, ObjectType } from 'type-graphql';

@ObjectType()
export class StatOutcomes {
  @Field(() => Int)
  eventCount: number;

  @Field(() => Int)
  studentCount: number;

  @Field(() => Int)
  volunteerCount: number;

  @Field(() => Int)
  projectCount: number;

  @Field(() => Int)
  prCount: number;

  @Field(() => Int)
  studentHours: number;

  @Field(() => Int)
  volunteerHours: number;

  @Field(() => Int)
  hours: number;
}
