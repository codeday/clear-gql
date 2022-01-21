import {Ticket} from "../generated/typegraphql-prisma";
import { sign } from "jsonwebtoken";
import config from "../config";


export function mintWaiverLink(ticket: Ticket): string {
    const tid = ticket.id;
    const audience = 'www-event';
    const token = sign(
        { tid },
        config.auth.secret,
        { audience, expiresIn: '1y', }
    );
    return `https://event.codeday.org/waiver/${token}`
}

export function renderStudentWaiverEmail(ticket: Ticket): string {
    const isMinor = ticket.age && ticket.age < 18 // todo: should use event majority age
    return `
${ticket.firstName}, it's almost CodeDay! I know! I, your completely human friend John, can't believe it either!

Since it's getting so close, I wanted to pass on all my secrets to having a great weekend as a human CodeDay attendee. Grab your friends, grab your laptops, and grab a ride. It all starts this Saturday at 11am.

CodeDay ${ticket.event?.name}:
${ticket.event?.venue?.address}


Waiver & Vaccine Requirements
-----------------------------

Everyone must have a signed waiver and proof of vaccination to attend CodeDay. To save time, please complete this requirement online ${isMinor? ' with your parent or guardian': ''}: 
[click here to sign waiver](${mintWaiverLink(ticket)})


Here's what to bring:
---------------------

*   Laptop (recommended), desktop computer with wifi, or tablet
*   Toothbrush and toothpaste (recommended)
*   Pillow and sleeping bag or blanket (recommended)

You can use any programming language you'd like, but if you're new to this, I recommend the free version of [Construct 3,](https://www.construct.net/) which runs on any modern computer or tablet.

We will check you in by name, no printed ticket is required.

This is going to be fun!
------------------------

You're in for a great weekend. Here's what you should expect, and what we expect from you.

*   **We're friendly.** Please respect and encourage others. Be humble.
*   **We're nice and reasonably professional.** Don't use offensive language about someone's gender/race/etc. Also, don't used sexualized language or content, and don't "hit on" other attendees.
*   **CodeDay is safe and legal.** No knives, weapons, alcohol, marijuana, or illegal drugs. Be careful and keep yourself and others safe.

[Read our full code of conduct](https://www.codeday.org/conduct) when you can.


FAQs
----

**I'm a minor; does my parent need to be there?**  
Not if they filled out the waiver online.

**What if I gave my ticket to a friend?**  
Let me know ASAP so I can transfer it.

**Can I come late?**  
Yes, but it's better if you arrive on-time.

**Can I leave early?**  
Yes, but you might not be able to return until 9am. If you're a minor, have your parent write you a note saying it's ok.

**Can go home to sleep?**  
Yes, but I don't recommend it. (Also, see above about leaving early.)

**You didn't answer my question!**  
Just reply and let me know your question :)
    `
}
export function renderStudentWaiverText(ticket: Ticket) {
    return `You're going to CodeDay this Saturday @ 11am! We'll check you in by name. Please fill out your waiver online: ${mintWaiverLink(ticket)}`
}
