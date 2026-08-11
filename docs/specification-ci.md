# Specification CI

Pull requests run `pnpm specification:validate`. Protected integration and release branches run `pnpm specification:coverage:strict`. Strict failures identify unresolved critical evidence gaps.

Emergency overrides must name affected requirements, explain the reason, identify an authorized approver, create a follow-up issue, and include an expiry or review date. Permanent silent waivers are forbidden.
