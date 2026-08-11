# Heartbeat Security

The heartbeat endpoint requires a production robot credential and validates its
robot/manufacturer scope before trusting operational fields. Secrets, raw signatures,
and complete payloads are excluded from audit and outbox data. Message and nonce
uniqueness, sequence locking, timestamp limits, request-size limits, model-controlled
state mapping, credential revocation, and immutable evidence provide layered
protection. Distributed production rate limiting must use Redis.

