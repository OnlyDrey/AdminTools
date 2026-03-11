# Windows 11 setup and recovery guide

This project is a Windows desktop app built with Electron + Vite + React.

> Status note: the repository/toolchain is generally ready. If install fails with `RequestError: unable to get local issuer certificate`, the primary blocker is usually **environment TLS trust/proxy configuration** during Electron binary download.

## Supported Node.js versions
- **Minimum required:** Node 22.12+
- **Recommended baseline:** Node 22 LTS
- **Newer Node versions:** allowed
- **Unsupported:** Node 21 and earlier versions

## 0) Verify your current environment

```powershell
node -v
npm -v
npm config get strict-ssl
npm config get cafile
npm config get proxy
npm config get https-proxy
echo $env:NODE_EXTRA_CA_CERTS
```

Optional quick inspection helper:

```powershell
npm run check:network-env
```

`package.json` enforces supported versions using both `engines` and a `preinstall` check.

## 1) Understand the main blocker vs secondary warnings
- **Main blocker:** Electron postinstall download fails with `unable to get local issuer certificate`.
- **Typical root cause:** Node/Electron cannot validate the certificate chain in your corporate network path.
- **Secondary warnings:** `EPERM` / `EBUSY` cleanup warnings are common on Windows and are often not the true blocker unless install still fails after TLS/proxy trust is correctly configured.

## 2) Configure certificate trust correctly (secure)
If install fails with `unable to get local issuer certificate`, Electron download is failing because Node does not trust your corporate TLS inspection CA chain.

1. Export your corporate root/intermediate chain as PEM.
2. Set environment variable for the current PowerShell session **before running npm install**:

```powershell
$env:NODE_EXTRA_CA_CERTS="C:\Users\<user>\certs\corp-root-chain.pem"
```

> `NODE_EXTRA_CA_CERTS` is read when the Node process starts. Set it first, then run `npm install` in that same shell.

3. Optionally also set npm CA file:

```powershell
npm config set cafile "C:\Users\<user>\certs\corp-root-chain.pem"
```

4. Keep SSL verification enabled (`strict-ssl=true`).
5. Depending on Node/environment policy, system CA trust can also help if your org root CA is already installed and recognized.

## 3) Configure proxy (if required)

```powershell
npm config set proxy http://proxy.company.local:8080
npm config set https-proxy http://proxy.company.local:8080
```

If Electron download still has connectivity problems in a proxy-controlled network, you can test with:

```powershell
$env:ELECTRON_GET_USE_PROXY="true"
```

## 4) Clean failed install artifacts (secondary but useful)

```powershell
Get-Process node,electron,esbuild -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue
npm cache verify
```

Fallback if Windows still reports locked folders:

```powershell
cmd /c rmdir /s /q node_modules
```

Optional helper script:

```powershell
npm run repair:env
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
Do not use permanent `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## Windows verification checklist (before install)
- [ ] Node is 22.12+ (recommended baseline: Node 22 LTS)
- [ ] Node 21 is not in use
- [ ] npm is 10+
- [ ] `strict-ssl` is true
- [ ] `NODE_EXTRA_CA_CERTS` is set (if required by your network)
- [ ] `cafile` is configured (if required)
- [ ] `proxy` and `https-proxy` are configured (if required)
- [ ] Cleanup warnings are treated as secondary unless TLS trust is already correct

## Happy path
1. Confirm Node and npm versions
2. Inspect npm TLS/proxy config
3. Set `NODE_EXTRA_CA_CERTS` if corporate CA PEM is available
4. Set npm `cafile` if needed
5. Set proxy if required
6. Run `npm run repair:env`
7. Run `npm run check:network-env`
8. Run `npm install`
9. Run `npm run dev`
