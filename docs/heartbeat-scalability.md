# Heartbeat scalability

Heartbeat requests authenticate and validate signatures before expensive work, enforce fleet/IP limits, reject replayed message IDs/nonces using unique constraints, and keep transactions short. Robot/credential sequence state serializes only the affected robot. Append-only evidence is indexed by robot, assignment, manufacturer, and time; BRIN supports large time scans.

Scale API ingestion independently from offline detection and verified-time finalization. Batch asynchronous projections, but never acknowledge before durable evidence is committed. Monitor accepted/rejected/duplicate throughput, signature latency, transaction latency, replay detections, queue lag, offline transitions, and verified-time finalization lag.
