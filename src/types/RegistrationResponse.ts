import { Field, ObjectType } from 'type-graphql';
import { RegistrationResponseTicket } from './RegistrationResponseTicket';

@ObjectType()
export class RegistrationResponse {
  @Field(() => String, { nullable: true })
  paymentIntent?: String;

  @Field(() => [RegistrationResponseTicket])
  tickets: RegistrationResponseTicket[];
}