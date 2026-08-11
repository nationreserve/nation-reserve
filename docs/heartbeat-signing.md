# Heartbeat Signing

Schema version 1 signs a deterministic UTF-8 JSON object containing, in order:
`schemaVersion`, `messageId`, `robotId`, `sentAt`, `sequenceNumber`, `nonce`,
`manufacturerState`, `assignmentId`, `firmwareVersion`, `apiVersion`, and
`networkStatus`. Dates use ISO 8601. Absent optional telemetry is not injected.

Supported algorithms are HMAC-SHA-256 and Ed25519. HMAC secrets are generated once,
returned once, and stored using AES-256-GCM under
`ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY`. Ed25519 private keys never enter the
platform. Constant-time HMAC comparison is used.

