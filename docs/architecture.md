# AdminTools architecture (MVP)

## Main process
- Electron app bootstrap/window creation
- IPC endpoints
- Vault read/write and secret encryption/decryption
- Protocol launchers (RDP)
- SSH/SFTP service lifecycle
- Detached window creation

## Renderer process
- React shell layout (top bar + sidebar + content)
- Session list and CRUD form
- Session tabs for SSH/SFTP/RDP actions
- Keyboard shortcuts and filtering

## Shared
- Typed session models (RDP/SSH/SFTP)
- Vault and import/export schema definitions
- Constants and defaults

## Extension points
- richer SFTP operations
- SSH shell stream binding in renderer
- stronger import validation and mapping
- advanced RDP integration phases
