# Acceptance Test Suite

Run `corepack pnpm acceptance:mvp`. The runner has a five-minute per-stage ceiling and preserves stage output in a machine-readable report. `corepack pnpm acceptance:test` validates report generation with a deterministic fixture; fixture success is not product acceptance.

Missing PostgreSQL, browser, cloud, device or processor dependencies produce a failed or blocked stage. Failed browser screenshots are required once a real browser runner is installed; the current absence is GAP-022-002.
