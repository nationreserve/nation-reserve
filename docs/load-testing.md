# Load and resilience testing

Prompt 020 k6 scenarios gate search, timeline, and heartbeat latency/error rate. Staging adds registration, messages, upload initiation, reports, queues, and cache failover. Tests record dataset, image digest, environment, throughput, percentiles, saturation, errors, and timeline/queue lag. Empty local results are not release evidence.

Resilience exercises terminate workers, delay providers, interrupt Redis, replay queues, fail uploads, time out payments, and restore database/object metadata. They must demonstrate retry safety, no duplicate financial effects, no lost timeline/audit events, and bounded recovery.
