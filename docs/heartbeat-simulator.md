# Development Heartbeat Simulator

Run `pnpm heartbeat:simulate` after setting the `HEARTBEAT_SIMULATOR_*` variables.
Add `--continuous` for repeated messages. State, interval, sequence, invalid
signature, clock skew, replay, and network-loss scenarios can be selected through
development environment values or by pausing the process.

The simulator refuses to run with `NODE_ENV=production`. Simulator traffic is
development evidence only and creates no real financial obligation.

