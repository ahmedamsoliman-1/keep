# VS Code extension integration

The `apps/vscode-extension` client consumes the same `/api/v1` surface, typed API
client, shared contracts and encryption protocol as the website. It never
connects directly to Redis or Firebase.

The Keep Activity Bar container hosts three views — **Environments**, **Clipboard**
and **Passwords** — mirroring the three product areas of the web app. Each view
shares the one device session, token storage and vault session described below.

## Authentication

Sign-in uses browser-approved device authorization with PKCE
(`docs/device-authorization.md`). The resulting revocable device token is stored
only in VS Code `SecretStorage` and sent as `Authorization: Bearer <token>`.

Reads (`projects:read`, `environments:read`, `variables:read`) and the vault
status endpoint accept device tokens. Writes require `variables:write`; the
import route authorizes device tokens through `getWriteAccess`, which skips the
browser trusted-origin (CSRF) check for token-authenticated requests because a
Bearer token carries no ambient authority.

## Local decryption

The extension unlocks the vault locally, exactly like the website:

1. `GET /api/v1/vault` returns the wrapped key material (safe to expose to an
   owner-scoped device session — it is encrypted and useless without the
   passphrase or recovery key).
2. `unlockVaultWithPassphrase` / `unlockVaultWithRecoveryKey` derive and unwrap
   the vault key using `@keephq/crypto` with the Node crypto provider
   (`@keephq/crypto/node`).
3. The unwrapped key is held in memory only and cleared on lock, sign-out,
   auto-lock and window close.

Values are decrypted (pull) and encrypted (push) locally with
`decryptVariableValue` / `encryptVariableValue`. Plaintext never reaches the
server.

## Silent unlock (device-wrapped key)

So the passphrase is entered at most once per device:

1. On first unlock the extension generates a random 32-byte device secret, wraps
   the vault key with it (`wrapVaultKeyWithDeviceSecret`, AAD purpose `device`),
   and stores the secret in `SecretStorage`.
2. The wrapped material is persisted server-side, bound to the device session:

   ```text
   GET    /api/v1/device/vault-key   → { wrapped: { vaultId, wrappedKey } | null }
   PUT    /api/v1/device/vault-key   ← { vaultId, wrappedKey }
   DELETE /api/v1/device/vault-key
   ```

   Only ciphertext and IV are stored — never the device secret or any plaintext.

3. Later sessions fetch the wrapped material and combine it with the local
   device secret to unwrap silently.
4. Revoking the device session removes the wrapped-key record, so a revoked
   device can no longer unlock silently and falls back to the passphrase.

## Push concurrency safety

Push classifies the local `.env` against remote variables (create / update /
unchanged / invalid) and never deletes: keys present only remotely are reported
and left untouched. Updates reuse the remote variable id (the import route
rejects a key/id mismatch). Commits go through `POST
/api/v1/environments/:id/import` with an expected version and a per-chunk
idempotency `operationId`. A stale push returns `409
ENVIRONMENT_VERSION_CONFLICT`, after which the user can overwrite (re-plan against
the latest version, local wins) or compare & merge.

## Clipboard view

The **Clipboard** view (`keep.clipboard`) renders the remote Keep Clipboard
stream as a scrollable tree via `client.clipboard.list()` — the metadata-only
list that carries a `safePreview` but never the content. Each row shows its
preview, origin client and persistence tags. Row actions reuse the same web
operations:

- **Copy** (default click) / **Insert into editor** — fetch the content on
  demand (`clipboard.get`, or `clipboard.consume` for `once` items) and write it
  to the OS clipboard or replace the active selection. Content is never held in
  the tree.
- **Pin / Unpin / Delete** — `clipboard.pin` / `unpin` / `delete`.

The view title offers **Send selection to Clipboard** (`clipboard.create` with
`originClient: "vscode"`) and the history Quick Pick. Sensitive and secret items
keep a shield icon and stay masked; server-side sensitivity detection is
unchanged. The stream is not yet client-side encrypted — that tracks the same
Part II encryption phase as the web app.

## Passwords view

The **Passwords** view (`keep.passwords`) browses the zero-knowledge password
vault. Because the **whole entry** is one encrypted blob, nothing is shown until
the vault is unlocked:

- Locked: a single **Unlock vault to view passwords** row invokes the shared
  unlock flow (silent device-wrapped unlock, else passphrase/recovery prompt).
- Unlocked: `client.passwords.list()` returns ciphertext, which is decrypted
  locally with the in-memory vault key using `decryptPasswordItem`
  (`@keephq/crypto`, Node provider), mirroring the website's
  `lib/password-entry.ts`. The key copy is zeroed immediately after decrypting.

Entries are **masked by default**. Per row the user can reveal/hide the password
(an in-memory, per-session toggle — the description flips between `••••••` and the
plaintext), copy the password, or copy the username. Decrypted values live only
in memory while the vault is unlocked and are dropped on lock, sign-out and
auto-lock. This is the read-and-reveal surface of Passwords Phase P2 ("surfacing
in VS Code"); create/edit/import remain web-only for now.
