# Disaster recovery drills

Quarterly drills cover database loss, object failure, Redis/queue loss, API/heartbeat outage, provider outage, and regional loss. The team declares the scenario, freezes unsafe financial work, restores the priority chain, replays idempotent jobs, validates Appendix O/audit continuity, measures RPO/RTO, communicates status, and records findings in `disaster_recovery_exercises`.

Source files do not prove a drill passed. Evidence must include timestamps, commands, restored identifiers, reconciliation results, dashboards, incident/timeline links, measured recovery, deviations, and assigned remediation.
