export enum AuthRole {
    ATTENDEE = 'a',
    VOLUNTEER = 'v',
    MANAGER = 'm',
    ADMIN = 'A',
}

export interface JwtToken {
    t: AuthRole
    u?: string  // username
}
