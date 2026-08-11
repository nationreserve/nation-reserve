# Financial Calculation

Authoritative money uses integer minor units and `bigint` rational arithmetic.
Verified seconds multiply the versioned hourly rate and divide by 3,600 using
half-up rounding. Fees use basis points and the same rounding policy.

At the initial configuration, 3,600 finalized seconds create a 500¢ base amount,
75¢ company fee, 575¢ company total, 75¢ owner fee, 425¢ owner net, and 150¢
platform revenue. Verified time is evidence; it is not payment.

