import { describe, expect, it } from "vitest";

import { ApiMetricsRegistry } from "./operations-instrumentation.js";

describe("ApiMetricsRegistry", () => {
  it("aggregates request counts and durations by bounded labels", () => {
    const metrics = new ApiMetricsRegistry();
    metrics.observe("get", "/api/v1/robots/:id", 200, 0.25);
    metrics.observe("GET", "/api/v1/robots/:id", 204, 0.75);

    const rendered = metrics.render();
    expect(rendered).toContain(
      'rwp_api_requests_total{method="GET",route="/api/v1/robots/:id",status_class="2xx"} 2',
    );
    expect(rendered).toContain(
      'rwp_api_request_duration_seconds_sum{method="GET",route="/api/v1/robots/:id",status_class="2xx"} 1',
    );
    expect(rendered).toContain(
      'rwp_api_request_duration_seconds_count{method="GET",route="/api/v1/robots/:id",status_class="2xx"} 2',
    );
  });

  it("escapes metric labels", () => {
    const metrics = new ApiMetricsRegistry();
    metrics.observe("GET", '/quoted/"route"', 500, 0.1);
    expect(metrics.render()).toContain('route="/quoted/\\"route\\""');
  });
});
