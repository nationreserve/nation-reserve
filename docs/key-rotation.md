# Key rotation

JWT, heartbeat encryption, manufacturer pepper, webhook, database, storage, and email credentials use `next`, `current`, and `previous` overlap. Deploy readers that accept next/current/previous, activate next for writes, observe, then retire previous after the maximum token/message/retry lifetime. Rotation is rehearsed in staging and recorded as security and configuration timeline events.

Compromise triggers immediate incident response, targeted revocation, provider coordination, audit review, credential reissue, and post-rotation validation. Never overwrite the sole usable key.
