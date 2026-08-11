# Specification Coverage Report

Generated: 2026-08-10T19:59:23.162Z

## Executive summary

Backend domain, database, heartbeat, finance, payments, operations, and reporting have substantial evidence. Coverage is partial because complete authoritative volumes, Appendix A, the public website, full page specifications, systematic explanations, authorization tests, accessibility validation, end-to-end tests, and real PostgreSQL execution evidence are missing.

## Coverage dimensions

| Dimension | Covered | Total |
|---|---:|---:|
| Sources present | 30 | 34 |
| Verified requirements | 23 | 41 |
| Immutable rules tested | 6 | 6 |
| Verified screens | 1 | 38 |
| Traceability mappings | 29 | 41 |

## Critical gaps

- None.

## Source coverage

Missing sources are never treated as extracted or implemented. See source-registry.yaml.

## Immutable-rule coverage

Untested current immutable rules block strict coverage.

## Feature, journey, screen, and explanation coverage

The public website is missing; several authenticated pages are generic rather than page-complete; user-explanation and recovery coverage remain partial.

## API, data, permission, event, notification, and test coverage

Seed evidence is present, but full automated extraction and exhaustive mapping remain future registry work. Real PostgreSQL tests were unavailable in the latest local environment.

## Prompt coverage

Prompts 001–010 have repository implementation summaries. Original prompt source files are not stored in the repository.

## Open conflicts and deferred work

See conflicts.yaml and deferred-work.yaml. Appendix A import is a critical blocker.

## Recommended next prompts

Prompt 012 should establish the design system and application shell. Prompt 013 should implement the public Nation Reserve website. Both must begin with prompt-header-template.md and run specification validation first.
