import {IsWorkHours, WouldSendLate, IsAfterEvent} from "./emails";
import {EmailTemplate, Event, Ticket} from "../generated/typegraphql-prisma";

const TEMPLATE_BASE:EmailTemplate = {
    automatic: true,
    createdAt: new Date(Date.UTC(2022, 0, 0, 0, 1).valueOf()),
    fromEmail: "fromemail@codeday.org",
    fromName: "From Name",
    id: "emailTemplate1",
    marketing: false,
    name: "Test Case Template",
    replyTo: "replyto@codeday.org",
    sendAfterEvent: false,
    sendInWorkHours: false,
    sendLate: false,
    sendParent: false,
    sendText: false,
    sendTo: "STUDENT",
    subject: "Email Subject",
    template: "Template Body {{ticket.id}}",
    updatedAt: new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf()),
    when: "2d",
    whenFrom: "REGISTER"
}

const EVENT_BASE: Event = {
    createdAt: new Date(Date.UTC(2022, 0, 0, 0, 0,).valueOf()),
    earlyBirdCutoff: new Date(Date.UTC(2022, 0, 7, 0, 0).valueOf()),
    earlyBirdPrice: 0,
    eventGroupId: "",
    id: "event1",
    majorityAge: 0,
    managers: [],
    name: "",
    registrationCutoff: new Date(Date.UTC(2022, 0, 0, ).valueOf()),
    registrationsOpen: false,
    startDate: new Date(Date.UTC(2022, 0, 13, 0, 0).valueOf()),
    ticketPrice: 0,
    updatedAt: new Date(Date.UTC(2022, 0, 10, 0, 0).valueOf()),
    endDate: new Date(Date.UTC(2022, 0, 14, 0, 0).valueOf())
}

const TICKET_BASE: Ticket = {
    createdAt: new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf()),
    eventId: "event1",
    firstName: "",
    id: "",
    lastName: "",
    type: "STUDENT",
    updatedAt: new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf()),
    waiverSigned: false
}
describe("IsWorkHours", () => {
    test("9am New York", () => {
        const NINE_AM_NEW_YORK = new Date(Date.UTC(2022, 0, 0, 14, 0).valueOf())
        jest.setSystemTime(NINE_AM_NEW_YORK)
        expect(IsWorkHours('America/New_York')).toBe(true)
    })
    test("6am Los Angeles", () => {
        const SIX_AM_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 14, 0).valueOf())
        jest.setSystemTime(SIX_AM_LOS_ANGELES)
        expect(IsWorkHours('America/Los_Angeles')).toBe(false)
    })
    test("9am Los Angeles", () => {
        const NINE_AM_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 17, 0).valueOf())
        jest.setSystemTime(NINE_AM_LOS_ANGELES)
        expect(IsWorkHours('America/Los_Angeles')).toBe(true)
    })
    test("Noon Los Angeles", () => {
        const NOON_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 20, 0).valueOf())
        jest.setSystemTime(NOON_LOS_ANGELES)
        expect(IsWorkHours('America/Los_Angeles')).toBe(true)
    })
    test("5:15pm Los Angeles", () => {
        const FIVE_FIFTEEN_PM_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 1, 15).valueOf())
        jest.setSystemTime(FIVE_FIFTEEN_PM_LOS_ANGELES)
        expect(IsWorkHours('America/Los_Angeles')).toBe(false)
    })
    test("9am Los Angeles (Null timezone)", () => {
        const NINE_AM_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 17, 0).valueOf())
        jest.setSystemTime(NINE_AM_LOS_ANGELES)
        expect(IsWorkHours(null)).toBe(true)
    })
    test("Noon Los Angeles (Invalid Timezone)", () => {
        const NOON_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 20, 0).valueOf())
        jest.setSystemTime(NOON_LOS_ANGELES)
        expect(IsWorkHours('NOT A TIMEZONE')).toBe(true)
    })
    test("5:15pm Los Angeles (Invalid Timezone)", () => {
        const FIVE_FIFTEEN_PM_LOS_ANGELES = new Date(Date.UTC(2022, 0, 0, 1, 15).valueOf())
        jest.setSystemTime(FIVE_FIFTEEN_PM_LOS_ANGELES)
        expect(IsWorkHours('NOT A TIMEZONE')).toBe(false)
    })
})

describe("IsAfterEvent", () => {
    const event:Event = {
        ...EVENT_BASE,
        endDate: new Date(Date.UTC(2022, 0, 14, 0, 0).valueOf())
    }
    test("Before Event", () => {
        const BEFORE_EVENT = new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf())
        jest.setSystemTime(BEFORE_EVENT)
        expect(IsAfterEvent(event)).toBe(false)
    })
    test("After Event", () => {
        const AFTER_EVENT = new Date(Date.UTC(2022, 0, 14, 0, 1).valueOf())
        jest.setSystemTime(AFTER_EVENT)
        expect(IsAfterEvent(event)).toBe(true)
    })
})

describe("WouldSendLate", () => {
    test("WhenFrom Register", () => {
        const event: Event = EVENT_BASE
        const ticket: Ticket = TICKET_BASE
        const template: EmailTemplate = {
            ...TEMPLATE_BASE,
            whenFrom: "REGISTER"
        }
        expect(WouldSendLate(event, ticket, template)).toBe(false)
    })
    test("WhenFrom EventEnd", () => {
        const event: Event = EVENT_BASE
        const ticket: Ticket = TICKET_BASE
        const template: EmailTemplate = {
            ...TEMPLATE_BASE,
            whenFrom: "EVENTEND"
        }
        expect(WouldSendLate(event, ticket, template)).toBe(false)
    })
    test("2 weeks before event, registered 3 weeks before", () => {
        const event: Event = {
            ...EVENT_BASE,
            startDate: new Date(Date.UTC(2022, 0, 30, 0, 0).valueOf())
        }
        const ticket: Ticket = {
            ...TICKET_BASE,
            createdAt: new Date(Date.UTC(2022, 0, 30 - (7 * 3), 0, 0).valueOf())
        }
        const template: EmailTemplate = {
            ...TEMPLATE_BASE,
            whenFrom: "EVENTSTART",
            when: "-2w"
        }
        expect(WouldSendLate(event, ticket, template)).toBe(false)
    })
    test("2 weeks before event, registered 1 week before", () => {
        const event: Event = {
            ...EVENT_BASE,
            startDate: new Date(Date.UTC(2022, 0, 30, 0, 0).valueOf())
        }
        const ticket: Ticket = {
            ...TICKET_BASE,
            createdAt: new Date(Date.UTC(2022, 0, 30 - (7 * 1), 0, 0).valueOf())
        }
        const template: EmailTemplate = {
            ...TEMPLATE_BASE,
            whenFrom: "EVENTSTART",
            when: "-2w"
        }
        expect(WouldSendLate(event, ticket, template)).toBe(true)
    })
})
