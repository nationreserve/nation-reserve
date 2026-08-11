# Windows Node 22 setup

The repository requires Node `>=22 <23` and pins `22.20.0` for reproducible local work. Do not change the project to Node 24 because a workstation happens to have it installed.

With nvm-windows:

```powershell
nvm install 22.20.0
nvm use 22.20.0
node --version
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm --version
pnpm install --frozen-lockfile
```

Open a new PowerShell window after `nvm use` if the old Node executable remains cached in `PATH`.
