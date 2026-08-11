# Frontend error handling

Normalize backend errors as validation, authentication, authorization, not found, conflict, rate limited, maintenance, external status unknown, temporary failure, or permanent failure. Preserve correlation codes for support but hide stacks, secrets, provider payloads, and internal paths. Unknown payment outcomes explicitly warn against duplicate submission. Critical financial, security, restriction, and maintenance feedback remains persistent rather than toast-only.

```text
response → normalize code → choose inline/section/page/boundary state
→ show safe recovery → log correlation context without sensitive values
```
