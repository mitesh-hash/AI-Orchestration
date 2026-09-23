// A synthetic transcript for tests and local demoing -- no real meeting
// content has been supplied yet, per the assumptions agreed with the user.
export const SAMPLE_TRANSCRIPT = `
Meeting: Checkout redesign kickoff
Date: 2026-09-10
Attendees: Priya (PM), Raj (BA), Alex (AVP)

Priya: The problem is our checkout abandonment rate is high because users
can't see shipping cost until the final step. We want to show an estimated
shipping cost on the cart page instead.

Raj: Got it. So the goal is: surface shipping cost earlier, on the cart
page, before checkout starts. That should be in scope for this quarter.

Alex: Agreed, this is in scope. Let's not touch international shipping
rules yet though -- keep that out of scope for now, it's a bigger project.

Priya: Raj, can you own writing up the BRD and get it to me by Friday?

Raj: Sure, I'll have a first draft by Friday.

Alex: Also someone needs to loop in the design team about wireframes, but
let's not assign that yet -- we'll decide in the next meeting.
`.trim();
