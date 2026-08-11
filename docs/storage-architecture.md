# Storage architecture

PostgreSQL stores file metadata and authorization; S3-compatible storage holds bytes. Clients receive short-lived signed URLs. New objects remain quarantined until checksum and malware validation complete. File scanning and thumbnail jobs are idempotent. Access is denied unless metadata status is `available` and the requester has explicit user or organization access.

Large training files use multipart upload IDs, resumable parts, checksums, versioning, and abort rules for abandoned uploads. Production buckets enable encryption, versioning, blocked public access, access logging, lifecycle transition to archive, and protected deletion. Restore exercises validate both database metadata and object versions.
