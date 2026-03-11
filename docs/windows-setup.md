# Windows 11 setup and recovery guide

## Recommended baseline
- Node.js: **20 LTS** (20.19+)
- npm: 10+
- Shell: PowerShell 7+ or Windows PowerShell

Node 21 is not supported for this project due to package engine constraints. Secondary supported lane is Node 22.12+.

## 1) Cleanly stop locking processes
In PowerShell, close IDE terminals and stop lingering node/electron/esbuild processes:

```powershell
Get-Process node,electron,esbuild -ErrorAction SilentlyContinue | Stop-Process -Force
```

If Defender/AV is locking files, add your repo path to allow-list according to your policy.

## 2) Remove lock files and node_modules safely
```powershell
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue
npm cache verify
```

If `node_modules` is still locked:
```powershell
cmd /c rmdir /s /q node_modules
```

## 3) Configure certificate trust correctly (secure path)
When Electron download fails with `unable to get local issuer certificate`, your corporate TLS inspection CA is not trusted by Node.

1. Export your corporate root/intermediate CA chain as PEM.
2. Set environment variable for your session:

```powershell
$env:NODE_EXTRA_CA_CERTS="C:\Users\<you>\certs\corp-root-chain.pem"
```

3. Optionally mirror in `.npmrc` with `cafile=...`.
4. Re-run install.

## 4) Proxy configuration (if required)
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
Use only to confirm TLS root-cause, then revert immediately:

```powershell
npm config set strict-ssl false
npm install
npm config set strict-ssl true
```
