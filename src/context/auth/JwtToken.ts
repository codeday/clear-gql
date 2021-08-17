export enum AuthRole {
    ATTENDEE = 'a',
    VOLUNTEER = 'v',
    MANAGER = 'm',
    ADMIN = 'A',
}

export interface JwtToken {
    typ: AuthRole
    u?: string  // username
    i?: string  // `Person` id
    e: string[] // list of associated event ids

}

export type JwtToken =
    {typ: AuthRole.ADMIN, u: string, i: undefined, e: undefined}
