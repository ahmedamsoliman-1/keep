# Keep for VS Code

Pull encrypted environments into your working tree, edit them as ordinary
`.env` files, and push changes back — without your secrets ever leaving your
machine in plaintext, and without overwriting a teammate's changes.

## Features

- **Browser-approved sign in** — device authorization with PKCE; no password is
  ever typed into VS Code. The revocable device token lives only in
  SecretStorage.
- **Local vault unlock** — unlock once with your passphrase (or recovery key).
  The extension then creates a device-wrapped key so later sessions unlock
  silently. The unwrapped key is held in memory only and auto-locks.
- **Pull** — decrypt an environment locally and write it to `.env`, with an
  overwrite guard and a built-in diff.
- **Push** — parse `.env`, preview what will change (created / updated /
  unchanged / invalid), encrypt locally, and commit with version and idempotency
  protection. On a conflict you can overwrite or compare & merge.
- **Environments view** — browse projects, environments and variable keys from
  the Activity Bar; pull or push an environment from its context menu.
- **Clipboard view** — a scrollable stream of your cross-device Keep Clipboard.
  Copy an item into VS Code, insert it at the cursor, pin/unpin or delete it, and
  send the current selection with **Keep: Send selection to Clipboard**. Sensitive
  previews stay masked.
- **Passwords view** — browse your zero-knowledge password vault. Entries are
  decrypted locally only while the vault is unlocked and masked by default;
  reveal, copy the password or copy the username per row.

## Getting started

1. Run **Keep: Sign in** and approve the device in your browser.
2. Open a folder, then **Keep: Select environment** to bind it.
3. **Keep: Pull environment → .env** to fetch secrets, or
   **Keep: Push .env → environment** to publish local changes.

Open the Command Palette with `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P`
(Windows/Linux) and search for `Keep`, or click the Keep status-bar item.

## Commands

- `Keep: Sign in` / `Keep: Sign out`
- `Keep: Unlock vault` / `Keep: Lock vault`
- `Keep: Select environment`
- `Keep: Pull environment → .env`
- `Keep: Push .env → environment`
- `Keep: Send selection to Clipboard` / `Keep: Open Clipboard history`
- `Keep: Show connection status`

## Settings

- `keep.serverUrl` — the Keep web application URL. Defaults to
  `https://env.aamsdn.space`. For local development use
  `{ "keep.serverUrl": "http://localhost:3000" }`.
- `keep.autoLockMinutes` — minutes of inactivity before the vault locks in
  VS Code. `0` (default) follows the vault's own auto-lock setting.

## Security

- Authentication uses browser-approved device authorization with PKCE. The
  revocable device token is stored only in SecretStorage.
- Encryption and decryption happen locally with the shared Keep protocol
  (AES-256-GCM). Plaintext values are never sent to the server.
- The unwrapped vault key is kept in memory only — never in settings,
  workspace state or on disk — and is cleared on lock, sign-out, auto-lock and
  window close.
- Silent unlock stores a random device secret in SecretStorage and the
  device-wrapped key server-side, bound to the device session. Revoking the
  device from Keep security settings disables silent unlock immediately.

The extension never requests or stores your Firebase password, TOTP secret or
raw recovery key.

## Development

Use Node.js 24 (see `.nvmrc`), install the workspace, and build:

```bash
pnpm install
pnpm --filter keep-vscode build
```

Package a locally installable VSIX:

```bash
pnpm --filter keep-vscode package:vsix
```

## Releasing

Publishing to the Marketplace is automated by the
[`Release VS Code extension`](../../.github/workflows/release-vscode.yml) GitHub
Actions workflow — no local `vsce` login or manual publish is needed.

**Channel convention:** an ODD minor (`0.5.x`) publishes to the pre-release
channel; an EVEN minor (`0.4.x`) to stable.

**One-time setup:** in the repository, create a `vscode-release`
[environment](https://docs.github.com/actions/deployment/targeting-different-environments)
and add:

- `VSCE_PAT` (required) — an Azure DevOps Personal Access Token for the `keep`
  publisher with **Marketplace: Manage** scope.
- `OVSX_PAT` (optional) — an Open VSX token; when present the build is mirrored
  there too.

**To cut a release** — bump the version in `package.json`, commit, then either:

```bash
# Option A — push a matching tag (the workflow verifies tag == package version)
git tag vscode-v$(node -p "require('./apps/vscode-extension/package.json').version")
git push origin --tags
```

or **Option B** — run the workflow manually from the Actions tab (optionally
overriding the channel). The workflow verifies, packages, publishes, and uploads
the `.vsix` as a build artifact.

For a fully local publish instead, `scripts/release.sh` still works (see its
header for usage) and requires `VSCE_PAT` in your shell.
