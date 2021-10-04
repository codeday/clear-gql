import { verify } from 'jsonwebtoken';
import config from '../../config';
import { JwtToken, AuthRole } from './JwtToken';

export class AuthContext {
    private readonly token?: JwtToken;

    private tokenString?: string;

    constructor(token?: string) {
        if (!token) return;
        this.tokenString = token;

        this.token = <JwtToken> verify(token, config.auth.secret, { audience: config.auth.audience });
        this.validate();
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    validate(): void {
        if (this.isAdmin && this.username) {
            throw Error('Admin tokens may not specify a username');
        }
        if ((this.isManager || this.isVolunteer) && !this.username) {
            throw Error('Manager/Volunteer tokens require username');
        }
    }

    get isAuthenticated(): boolean {
        return Boolean(this.token);
    }

    get type(): AuthRole | undefined {
        return this.token?.t;
    }

    get isAdmin(): boolean {
        return this.type === AuthRole.ADMIN;
    }

    get isManager(): boolean {
        return this.type === AuthRole.MANAGER;
    }

    get isVolunteer(): boolean {
        return this.type === AuthRole.VOLUNTEER;
    }

    get isAttendee(): boolean {
        return this.type === AuthRole.ATTENDEE;
    }

    get username(): string | undefined {
        return this.token?.u || undefined;
    }
}
