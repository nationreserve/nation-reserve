# Nation Reserve public website

Prompt 013 implements the complete public route catalog in `apps/web/src/PublicPages.tsx`, using the shared Prompt 012 shell and design system. Every substantive page opens with “What this page is about,” defines one meaningful page title, and provides role-specific next steps.

Implemented areas include the homepage, RoboWorkPool overview and lifecycle, Robot Owner, Hiring Company, Robot Manufacturer, Heartbeat API, pricing, trust and verification, Downpayment Queue, searchable FAQ, Republic, Med Pool, About, Contact, Support, public status, privacy, terms, accessibility, cookie policy, acceptable use, Manufacturer API terms, and public error states. Canonical aliases preserve Appendix I’s shorter route names.

Public pages emit only sanitized custom conversion events. No analytics vendor, cookie-consent vendor, content-management backend, public status feed, contact-delivery endpoint, or live public pricing endpoint is claimed. Authenticated records are never included in public search.
