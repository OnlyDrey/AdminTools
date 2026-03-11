# Windows 11 setup and recovery guide

This project is a Windows desktop app built with Electron + Vite + React.

## Supported Node.js versions
- **Recommended:** Node 20.19+
- **Also supported:** Node 22.12+
- **Unsupported:** Node 21

## 0) Verify your current environment

```powershell
node -v
npm -v
```

`package.json` enforces supported LTS lanes via `engines` and a `preinstall` check.

## 1) Stop common lock holders
In PowerShell, close IDE terminals and stop lingering node/electron/esbuild processes:

```powershell
Get-Process node,electron,esbuild -ErrorAction SilentlyContinue | Stop-Process -Force
```

If Defender/AV is locking files, add your repo path to allow-list according to your company policy.

## 2) Remove failed install artifacts safely

```powershell
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue
npm cache verify
```

Fallback if Windows still reports locked folders:

```powershell
cmd /c rmdir /s /q node_modules
```

Optional helper script (same behavior, Windows-focused):

```powershell
npm run repair:env
```

## 3) Configure certificate trust correctly (secure)
If install fails with `unable to get local issuer certificate`, Electron download is failing because Node does not trust your corporate TLS inspection CA chain.

1. Export your corporate root/intermediate chain as PEM.
2. Set environment variable for the current PowerShell session:

```powershell
$env:NODE_EXTRA_CA_CERTS="C:\Users\<user>\certs\corp-root-chain.pem"
```

3. Optionally also set npm CA file:

```powershell
npm config set cafile "C:\Users\<user>\certs\corp-root-chain.pem"
```

4. Keep SSL verification enabled (`strict-ssl=true`).

## 4) Configure npm proxy (if required)

```powershell
npm config set proxy http://proxy.company.local:8080
npm config set https-proxy http://proxy.company.local:8080
```

## 5) Install and run

```powershell
npm install
npm run dev
```

## Temporary diagnostics only (insecure)
Use only to prove TLS root cause, then revert immediately:

```powershell
npm config set strict-ssl false
npm install
npm config set strict-ssl true
```

Do not keep insecure settings enabled.

## Windows verification checklist (before install)
- [ ] Node is 20.19+ or 22.12+
- [ ] Node 21 is not in use
- [ ] npm is 10+
- [ ] No lingering `node`, `electron`, `esbuild` processes
- [ ] `node_modules` removed after failed installs
- [ ] Corporate CA path is configured when required
- [ ] Proxy is configured when required
- [ ] `strict-ssl` remains enabled

## Happy path
1. Use Node 20.19+
2. Confirm versions (`node -v`, `npm -v`)
3. Configure CA/proxy if needed
4. Clean old install artifacts
5. Run `npm install`
6. Run `npm run dev`
