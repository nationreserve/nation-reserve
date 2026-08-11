# Development Email

`DevelopmentEmailAdapter` can expose verification and reset tokens only outside
production. Tests use `TestEmailAdapter.messages`. Production construction of the
development or in-memory rate-limit adapters throws immediately.

Local tokens are sensitive even when accounts are disposable. Do not commit mailbox
output or copy it to shared logs.

