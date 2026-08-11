# Robot Model Approval

Models begin as editable drafts. Submission creates a reviewable revision. Approved
revisions are database-immutable and production robots retain the revision used at
registration. Production registration requires `production_approved`; sandbox accepts
`sandbox_approved` or production-approved revisions.

Unknown native operational states map to `unavailable`, never `operating`.

