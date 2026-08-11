# Terraform environments

AWS ECS Fargate is the only production target. Each directory has independent Terraform state, VPC, RDS, Redis, S3, keys, DNS inputs, monitoring labels, and image promotion. Configure the remote S3 backend and DynamoDB locking externally during account bootstrap. Never commit tfvars containing secrets.

Use `terraform fmt -check -recursive`, `terraform init -backend=false`, and `terraform validate` in CI. Plans are artifacts; applies use OIDC service identities and protected GitHub environments. Preview environments use the test module with a PR-specific name/account and are destroyed on PR close. Production requires approval and deploys the exact staging image digest.
