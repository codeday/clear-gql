import emails, {IsAfterEvent, IsWorkHours, WouldSendLate} from "./emails";
import {EmailTemplate, Event, Ticket} from "../generated/typegraphql-prisma";
import {PrismaClient} from '@prisma/client';

const mockSendEmailBatch = jest.fn()

// importing these enums directly throws a compiler error
enum TicketType {
    STUDENT = "STUDENT",
    TEACHER = "TEACHER",
    VIP = "VIP",
    MENTOR = "MENTOR",
    JUDGE = "JUDGE",
    STAFF = "STAFF"
}

enum EmailWhenFrom {
    REGISTER = "REGISTER",
    EVENTSTART = "EVENTSTART",
    EVENTEND = "EVENTEND"
}

jest.mock('postmark', () => {
    return {
        ServerClient: jest.fn().mockImplementation(() => {
            return {sendEmailBatch: (emails: Array<any>) => {mockSendEmailBatch([...emails])}}
        })
    }
})

const prisma = new PrismaClient({
    datasources: {
        db: {
            // hardcoding so this can't accidentally be used on a production db, as it wipes it during tests
            // (although many many things would need to go wrong first for that to be the case)
            url: "postgresql://prisma:prisma@localhost:5433/tests"
        }
    }
})

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
    test("0 UTC invalid fallback tz", () => {
        const ZERO_UTC = new Date(Date.UTC(0,0,0,0,0,0,0,))
        expect(IsWorkHours('NOT A TIMEZONE', 'NOT A TIMEZONE EITHER')).toBe(true)
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
            createdAt: new Date(Date.UTC(2022, 0, 30 - 7, 0, 0).valueOf())
        }
        const template: EmailTemplate = {
            ...TEMPLATE_BASE,
            whenFrom: "EVENTSTART",
            when: "-2w"
        }
        expect(WouldSendLate(event, ticket, template)).toBe(true)
    })
})

describe("Prisma Integration Tests", () => {
    interface CreateEventGroupOpts {
        [key: string]: any
        events: CreateEventOpts[]
    }
    interface CreateEventOpts {
        [key:string]: any
        tickets: CreateTicketOpts[]
    }
    interface CreateTicketOpts {
        [key:string]: any
    }
    const create_email_template = async (opts: {
        [key: string]: any
        when: string
        whenFrom: EmailWhenFrom
        sendTo: TicketType
    }) => {
        await prisma.emailTemplate.create({
            data: {
                createdAt: opts.createdAt || new Date(Date.UTC(2021, 0, 0, 0, 0)),
                name: opts.name || "Email Template",
                subject: opts.subject || "Email",
                fromEmail: opts.fromEmail || "from@email",
                fromName: opts.fromName || "Test Case Tester",
                replyTo: opts.replyTo || "reply@email",
                when: opts.when,
                whenFrom: opts.whenFrom,
                template: opts.template || "Test Case Email Contents",
                sendTo: opts.sendTo,
                automatic: opts.automatic || true,
                sendLate: opts.sendLate || false,
                sendInWorkHours: opts.sendInWorkHours || false,
                sendParent: opts.sendParent || false,
                sendText: opts.sendText || false,
                sendAfterEvent: opts.sendAfterEvent || false,
                marketing: opts.marketing || false
            }
        })
    }

    const create_event_group = async (opts: CreateEventGroupOpts) => {
        await prisma.eventGroup.create({
            data: {
                createdAt: opts.createdAt || new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf()),
                name: opts.name || "Test Case Event Group",
                startDate: opts.startDate || new Date(Date.UTC(2022, 1, 0, 0, 0).valueOf()),
                endDate: opts.startDate || new Date(Date.UTC(2022, 1, 1, 0, 0).valueOf()),
                ticketPrice: opts.ticketPrice || 20,
                earlyBirdPrice: opts.earlyBirdPrice || 10,
                earlyBirdCutoff: opts.earlyBirdCutoff || new Date(Date.UTC(2022, 0, 20, 0, 0).valueOf()),
                registrationCutoff: opts.registrationCutoff || new Date(Date.UTC(2022, 1, 0, 0, 0).valueOf()),
                events: {
                    //@ts-ignore
                    create: opts.events.map((e) => make_create_event_args(e))
                }
            }})
    }
    const make_create_event_args = (opts: CreateEventOpts) => {
        return {
            createdAt: opts.createdAt || new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf()),
            name: opts.name || "Test Case Event",
            startDate: opts.startDate || new Date(Date.UTC(2022, 1, 0, 0, 0).valueOf()),
            endDate: opts.endDate || new Date(Date.UTC(2022, 1, 1, 0, 0).valueOf()),
            ticketPrice: opts.ticketPrice ||20,
            earlyBirdPrice: opts.earlyBirdPrice || 10,
            earlyBirdCutoff: opts.earlyBirdCutoff || new Date(Date.UTC(2022, 0, 20, 0, 0).valueOf()),
            registrationCutoff: opts.registrationCutoff || new Date(Date.UTC(2022, 1, 0, 0, 0).valueOf()),
            tickets: {
                create: opts.tickets.map((t) => make_create_ticket_args(t))
            }
        }
    }
    const make_create_ticket_args = (opts: CreateTicketOpts) => {
        return {
            createdAt: opts.createdAt || new Date(Date.UTC(2022, 0, 0, 0, 0).valueOf()),
            firstName: opts.firstName || "Test Case First Name",
            lastName: opts.lastName || "Test Case Last Name",
            type: opts.type || "STUDENT",
            email: opts.email || "ticket@email",
        }
    }

    const all_ticket_emails_are_true = (calls: any[]) => {
        return calls.filter(call => call.To !== 'true').length == 0
    }
    afterEach(async () => {
        await prisma.venue.deleteMany()
        await prisma.emailTemplate.deleteMany()
        await prisma.person.deleteMany()
        await prisma.ticket.deleteMany()
        await prisma.event.deleteMany()
        await prisma.eventGroup.deleteMany()
        mockSendEmailBatch.mockReset()
    })
    describe("Send to right group", () => {
        // @ts-ignore
        const TICKET_TYPES: TicketType[] = Object.keys(TicketType)
        test.each(TICKET_TYPES)('%s',async (t: TicketType) => {
            await create_email_template({
                sendTo: t,
                when: "0m",
                whenFrom: EmailWhenFrom.REGISTER,
            })
            await create_event_group({
                events: [
                    {
                        tickets: TICKET_TYPES.map((i) => { return { type: i, email: i === t? 'true' : 'false'}})
                    }
                ]
            })
            jest.setSystemTime(new Date(Date.UTC(2022, 0, 0, 0, 0, 1).valueOf()))
            await emails()
            expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
            const calls = mockSendEmailBatch.mock.calls[0][0]
            expect(all_ticket_emails_are_true(calls)).toBe(true)
            expect(calls.length).toBe(1)
        })
    })
    describe("Send at right time", () => {
        describe("WhenFrom REGISTER", () => {
            test("When 0m",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "0m",
                    whenFrom: EmailWhenFrom.REGISTER,
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'first'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'second'
                                }
                            ]
                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 0, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 3, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(1)
                expect(mockSendEmailBatch.mock.calls[1][0][0].To).toBe('first')
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 6, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(4)
                expect(mockSendEmailBatch.mock.calls[3][0].length).toBe(1)
                expect(mockSendEmailBatch.mock.calls[3][0][0].To).toBe('second')
            })
            test("When 7d",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "7d",
                    whenFrom: EmailWhenFrom.REGISTER,
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'first'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'second'
                                }
                            ]
                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 4, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(1)
                expect(mockSendEmailBatch.mock.calls[1][0][0].To).toBe('first')
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 20, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(4)
                expect(mockSendEmailBatch.mock.calls[3][0].length).toBe(1)
                expect(mockSendEmailBatch.mock.calls[3][0][0].To).toBe('second')
            })
        })
        describe("WhenFrom EVENTSTART", () => {
            test("When 0m",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "0m",
                    whenFrom: EmailWhenFrom.EVENTSTART,
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                }
                            ]
                        },
                        {
                            startDate: new Date(Date.UTC(2023, 0, 3, 0, 0, 0).valueOf()),
                            tickets: [
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                            ]

                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 1, 0, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(2)
                expect(all_ticket_emails_are_true(mockSendEmailBatch.mock.calls[1][0])).toBe(true)
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
            })
            test("When -7d",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "-7d",
                    whenFrom: EmailWhenFrom.EVENTSTART,
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                }
                            ]
                        },
                        {
                            startDate: new Date(Date.UTC(2023, 0, 3, 0, 0, 0).valueOf()),
                            tickets: [
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                            ]

                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 25, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(2)
                expect(all_ticket_emails_are_true(mockSendEmailBatch.mock.calls[1][0])).toBe(true)
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
            })
            test("When 7d",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "7d",
                    whenFrom: EmailWhenFrom.EVENTSTART,
                    sendAfterEvent: true
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                }
                            ]
                        },
                        {
                            startDate: new Date(Date.UTC(2023, 0, 3, 0, 0, 0).valueOf()),
                            tickets: [
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                            ]

                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 25, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 1, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(2)
                expect(all_ticket_emails_are_true(mockSendEmailBatch.mock.calls[1][0])).toBe(true)
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
            })
        })
        describe("WhenFrom EVENTEND", () => {
            test("When 0m",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "0m",
                    whenFrom: EmailWhenFrom.EVENTEND,
                    sendAfterEvent: true
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                }
                            ]
                        },
                        {
                            startDate: new Date(Date.UTC(2023, 0, 3, 0, 0, 0).valueOf()),
                            endDate: new Date(Date.UTC(2023, 0, 4, 0, 0, 0).valueOf()),
                            tickets: [
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                            ]

                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 1, 1, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(2)
                expect(all_ticket_emails_are_true(mockSendEmailBatch.mock.calls[1][0])).toBe(true)
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
            })
            test("When -7d",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "-7d",
                    whenFrom: EmailWhenFrom.EVENTEND,
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                }
                            ]
                        },
                        {
                            startDate: new Date(Date.UTC(2023, 0, 3, 0, 0, 0).valueOf()),
                            endDate: new Date(Date.UTC(2023, 0, 4, 0, 0, 0).valueOf()),
                            tickets: [
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                            ]

                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 0, 28, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(2)
                expect(all_ticket_emails_are_true(mockSendEmailBatch.mock.calls[1][0])).toBe(true)
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
            })
            test("When 7d",async () => {
                await create_email_template({
                    sendTo: TicketType.STUDENT,
                    when: "7d",
                    whenFrom: EmailWhenFrom.EVENTEND,
                    sendAfterEvent: true
                })
                await create_event_group({
                    events: [
                        {
                            tickets: [
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 3, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                },
                                {
                                    createdAt: new Date(Date.UTC(2022, 0, 5, 0, 0, 0).valueOf()),
                                    type: TicketType.STUDENT,
                                    email: 'true'
                                }
                            ]
                        },
                        {
                            startDate: new Date(Date.UTC(2023, 0, 3, 0, 0, 0).valueOf()),
                            endDate: new Date(Date.UTC(2023, 0, 4, 0, 0, 0).valueOf()),
                            tickets: [
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                                {
                                    type: TicketType.STUDENT,
                                    email: 'false'
                                },
                            ]

                        }
                    ]
                })
                jest.setSystemTime(new Date(Date.UTC(2022, 1, 6, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(1)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
                jest.setSystemTime(new Date(Date.UTC(2022, 1, 10, 0, 0, 1).valueOf()))
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(2)
                expect(mockSendEmailBatch.mock.calls[1][0].length).toBe(2)
                expect(all_ticket_emails_are_true(mockSendEmailBatch.mock.calls[1][0])).toBe(true)
                await emails()
                expect(mockSendEmailBatch).toHaveBeenCalledTimes(3)
                expect(mockSendEmailBatch).toHaveBeenLastCalledWith([])
            })
        })
    })
})
