# CI pipeline

Pull requests and protected branches run specification validation/sync/coverage, formatting, lint, typechecks, unit/integration tests, authorization tests, accessibility tests, builds, empty-database migrations, container builds, SBOM generation, dependency audit, secret scanning, container scanning, Terraform validation, and Checkov. Main additionally enforces strict specification coverage.

Failures are blocking. Infrastructure requires operational review, authorization changes security review, and financial calculations financial review. Direct production deployment and skipped required checks are prohibited by branch and GitHub environment protection.
