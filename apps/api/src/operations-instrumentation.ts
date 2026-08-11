import os from "node:os";
import type pg from "pg";

type ApiMetric = {
  count: number;
  durationSeconds: number;
};

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

export class ApiMetricsRegistry {
  private readonly metrics = new Map<string, ApiMetric>();

  observe(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const normalizedMethod = method.toUpperCase();
    const normalizedRoute = route || "unmatched";
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const key = JSON.stringify([normalizedMethod, normalizedRoute, statusClass]);
    const current = this.metrics.get(key) ?? { count: 0, durationSeconds: 0 };
    current.count += 1;
    current.durationSeconds += durationSeconds;
    this.metrics.set(key, current);
  }

  render(): string {
    const lines = [
      "# HELP rwp_api_requests_total Completed API requests.",
      "# TYPE rwp_api_requests_total counter",
    ];
    for (const [key, value] of this.metrics) {
      const [method, route, statusClass] = JSON.parse(key) as [string, string, string];
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status_class="${escapeLabel(statusClass)}"`;
      lines.push(`rwp_api_requests_total{${labels}} ${value.count}`);
    }
    lines.push(
      "# HELP rwp_api_request_duration_seconds Total request duration and observation count.",
      "# TYPE rwp_api_request_duration_seconds summary",
    );
    for (const [key, value] of this.metrics) {
      const [method, route, statusClass] = JSON.parse(key) as [string, string, string];
      const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status_class="${escapeLabel(statusClass)}"`;
      lines.push(
        `rwp_api_request_duration_seconds_sum{${labels}} ${value.durationSeconds}`,
        `rwp_api_request_duration_seconds_count{${labels}} ${value.count}`,
      );
    }
    return `${lines.join("\n")}\n`;
  }
}

export interface WorkerInstrumentationOptions {
  workerName: string;
  queueName: string;
  version?: string;
  heartbeatIntervalMs?: number;
}

export class PostgresWorkerInstrumentation {
  readonly workerId: string;
  private readonly heartbeatIntervalMs: number;

  constructor(
    private readonly pool: pg.Pool,
    private readonly options: WorkerInstrumentationOptions,
  ) {
    this.workerId = `${options.workerName}:${os.hostname()}:${process.pid}`;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
  }

  async heartbeat(
    status: "starting" | "running" | "draining" | "stopped" | "failed",
    currentJobRunId?: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO worker_heartbeats(
        worker_id,worker_name,queue_name,status,current_job_run_id,last_heartbeat_at,
        started_at,version,host_safe,metadata_safe
      ) VALUES($1,$2,$3,$4,$5,now(),now(),$6,$7,$8)
      ON CONFLICT(worker_id) DO UPDATE SET
        status=excluded.status,current_job_run_id=excluded.current_job_run_id,
        last_heartbeat_at=excluded.last_heartbeat_at,version=excluded.version,
        metadata_safe=excluded.metadata_safe,updated_at=now()`,
      [
        this.workerId,
        this.options.workerName,
        this.options.queueName,
        status,
        currentJobRunId ?? null,
        this.options.version ?? "0.1.0",
        os.hostname(),
        { pid: process.pid },
      ],
    );
  }

  async run<T>(
    jobName: string,
    payloadSafe: Record<string, unknown>,
    work: () => Promise<T>,
    resultSafe: (result: T) => Record<string, unknown> = () => ({}),
  ): Promise<T> {
    await this.heartbeat("starting");
    const inserted = await this.pool.query<{ id: string }>(
      `INSERT INTO background_job_runs(job_definition_id,status,started_at,locked_at,locked_by,payload_safe)
       SELECT id,'running',now(),now(),$2,$3 FROM background_job_definitions
       WHERE job_name=$1 AND status='active' RETURNING id`,
      [jobName, this.workerId, payloadSafe],
    );
    const runId = inserted.rows[0]?.id;
    if (!runId) throw new Error(`JOB_DEFINITION_NOT_ACTIVE:${jobName}`);
    await this.heartbeat("running", runId);
    const timer = setInterval(() => {
      void this.heartbeat("running", runId);
    }, this.heartbeatIntervalMs);
    timer.unref();
    try {
      const result = await work();
      await this.pool.query(
        `UPDATE background_job_runs SET status='succeeded',finished_at=now(),
         duration_ms=(EXTRACT(EPOCH FROM now()-started_at)*1000)::bigint,
         result_safe=$2,updated_at=now() WHERE id=$1`,
        [runId, resultSafe(result)],
      );
      await this.heartbeat("stopped");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Worker job failed";
      await this.pool.query(
        `UPDATE background_job_runs SET status='failed',finished_at=now(),
         duration_ms=(EXTRACT(EPOCH FROM now()-started_at)*1000)::bigint,
         failure_code='WORKER_JOB_FAILED',failure_message_safe=$2,updated_at=now() WHERE id=$1`,
        [runId, message],
      );
      await this.pool.query(
        `INSERT INTO operational_diagnostic_events(
          event_type,severity,source,error_code,message_safe,resource_type,resource_id,
          correlation_id,occurred_at,metadata_safe
        ) SELECT 'background_job.failed','error',$2,'WORKER_JOB_FAILED',$3,
          'background_job_run',$1,correlation_id,now(),jsonb_build_object('jobName',$4)
          FROM background_job_runs WHERE id=$1`,
        [runId, this.options.workerName, message, jobName],
      );
      await this.heartbeat("failed");
      throw error;
    } finally {
      clearInterval(timer);
    }
  }
}
