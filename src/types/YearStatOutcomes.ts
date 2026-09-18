import { Field, Int, ObjectType } from 'type-graphql';
import { StatOutcomes } from './StatOutcomes';

@ObjectType()
export class YearStatOutcomes {
  @Field(() => Int)
  year: number;

  @Field(() => StatOutcomes)
  statOutcomes: StatOutcomes;
}
