# Financial terminology in the UI

Presentation receives integer minor units and configured currency. `MoneyAmount`, `RateDisplay`, `FeeBreakdown`, status components, and reusable definitions preserve the distinction among scheduled, verified, accrued, invoiced, submitted, processing, settled, financially ready, ready for payout, and paid. The frontend never performs authoritative financial arithmetic; the breakdown is explanatory and must receive active versioned configuration in production.
