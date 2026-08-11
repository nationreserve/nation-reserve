# Container builds

Five Dockerfiles build web, API, worker, migration, and scheduler roles on pinned Node/nginx bases. Application processes run as UID 10001 or nginx, include health checks, accept immutable commit labels, exclude `.env` and build output, and support read-only task filesystems. CI builds every image, generates SPDX SBOMs, and blocks high/critical Trivy findings.

Release tags include semver, commit SHA, and immutable registry digest. `latest` is not a production identity. Registry retention must preserve every currently deployed and previous approved rollback digest.
