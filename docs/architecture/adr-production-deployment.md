# ADR: Production deployment architecture

Status: accepted for implementation; infrastructure has not yet been applied.

RoboWorkPool will use AWS ECS Fargate as the single production orchestrator. Web, API, workers, migrations, and schedulers are immutable OCI images in ECR. An internet-facing ALB exposes only web/API listeners. ECS tasks run in private subnets; RDS PostgreSQL and ElastiCache Redis are private and security-group restricted. S3 is private, encrypted, versioned, and accessed through service identity. Secrets Manager supplies runtime secrets. CloudWatch receives logs, metrics, alarms, and deployment evidence.

Kubernetes was considered but rejected for the initial operating team because its control-plane and add-on burden is not justified. A PaaS was considered but provides weaker control over network isolation, migration jobs, regulated financial operations, and disaster recovery. ECS retains managed orchestration with blue/green-capable services and independent scaling.

Expected scale is millions of robots/users and high heartbeat throughput. Fargate services scale horizontally; RDS, Redis, and S3 use managed scaling and recovery. Costs are environment-sized, with preview/test resources disposable. Rollback promotes a prior immutable image digest; database rollback uses forward-compatible expand/contract migrations or approved restore, never blind destructive reversal. Region recovery restores RDS PITR, uses replicated/versioned objects, recreates compute through Terraform, and replays idempotent queues. Limitations: AWS dependency, initial single-region active service, and required external approval/configuration before apply.
