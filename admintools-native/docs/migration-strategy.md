# Migration Strategy from Electron Vault/Settings

## Data mapping

| Electron concept | Native model | Notes |
|---|---|---|
| vault folders tree | `core::FolderNode` | Preserve IDs to keep stable references |
| session records | `core::Session` | Keep protocol enum + host/port normalization |
| credential profile metadata | `core::CredentialProfile` | Secret value moves out of JSON to Credential Manager |
| templates | `core::SessionTemplate` | Keep defaults JSON in phase 1 |
| smart views | `core::SmartView` | Query string kept as expression payload |
| active workspace | `core::WorkspaceState` | Restorable tab/pane layout |

## Migration phases

1. **Import compatibility reader**
   - Parse existing vault JSON shape from Electron app
   - Map records to `VaultSnapshot`
   - Preserve IDs and folder/session relationships
2. **Credential remap**
   - For each credential with a secret, write to Windows Credential Manager
   - Store reference key (`secretReference`) in native vault JSON
   - Never persist clear-text passwords in native config
3. **Workspace migration**
   - Map open sessions + active tab to `WorkspaceState`
   - Populate split pane metadata where possible, else default single pane
4. **Validation and rollback path**
   - Keep source vault untouched
   - Write migrated vault to separate native app-data path
   - Emit migration diagnostics report for unsupported fields

## Compatibility notes

- Electron app remains in place as parallel implementation.
- Native app can coexist using separate config root.
- Feature-level parity is tracked in `feature-parity.md`.
