# RoboWorkPool Specification Registry

This directory is the canonical, version-controlled implementation-control registry. The database projection and dashboard are rebuildable views and are not authoritative.

Source precedence is: approved latest amendment; Appendix M; Appendix A; domain appendix; functional specification; technical architecture; implementation prompt; existing behavior. Conflicts are recorded rather than silently resolved.

Commands:

```sh
pnpm specification:validate
pnpm specification:coverage
pnpm specification:coverage:strict
pnpm specification:report
pnpm specification:sync
```

Strict coverage is expected to fail while a current critical requirement, immutable-rule test, required screen, explanation, journey, authorization mapping, or critical conflict remains unresolved. Later prompts must validate first and update affected registries.
