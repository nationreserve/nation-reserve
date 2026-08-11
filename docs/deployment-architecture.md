# Deployment architecture

The accepted architecture is AWS ECS Fargate, documented by the production ADR. ECR stores immutable web, API, worker, migration, and scheduler images. The public ALB is the only application ingress. Tasks, RDS PostgreSQL, and ElastiCache Redis use private subnets and least-privilege security groups. Private encrypted S3 stores uploads. Secrets Manager, CloudWatch, ACM, and protected GitHub environments provide secrets, observability, TLS, and approval control.

Docker Compose remains local-only. Production deployment is performed by GitHub OIDC service identities, never developer workstation credentials. Staging and production promote the same image digest. ECS circuit-breaker rollback protects stateless services; database evolution follows expand/contract.
