# Native client releases

Keep publishes native installers from `.github/workflows/release-native.yml`.
Release builds run on the target operating system, produce deterministic asset
names, generate SHA-256 checksums and GitHub build-provenance attestations, and
publish from an existing `keep-v*` Git tag.

## Release assets

- `Keep-Clipboard-macOS-arm64.dmg`
- `Keep-Clipboard-Windows-x64-Setup.exe`
- `Keep-Clipboard-Windows-x64.msi`
- `SHA256SUMS.txt`

Android APK/AAB assets will join this list only after the native Android shell,
secure storage, biometrics, Sharesheet and notification work passes its release
gate. The download page intentionally labels Android as in progress until then.

## GitHub environment

Create a protected GitHub environment named `native-release`. Require reviewer
approval and restrict deployment to protected `keep-v*` tags. Configure:

| Kind                 | Name                            | Purpose                                                                                |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| Environment variable | `KEEP_WINDOWS_RELEASE_APPROVED` | Must equal `true` after Credential Manager integration and Windows device testing pass |
| Environment secret   | `WINDOWS_CERTIFICATE_BASE64`    | Base64-encoded Authenticode PFX                                                        |
| Environment secret   | `WINDOWS_CERTIFICATE_PASSWORD`  | PFX password                                                                           |

Do not set the approval variable early. The workflow treats it as a security
gate and refuses to publish the Windows installer without it or the signing
certificate.

## Publishing

1. Update the version in `apps/keep-desktop/package.json`,
   `apps/keep-desktop/src-tauri/Cargo.toml`, and
   `apps/keep-desktop/src-tauri/tauri.conf.json`.
2. Merge a green CI build.
3. Create and push a protected tag such as `keep-v0.2.0`.
4. Approve the `native-release` environment deployment.
5. Verify the release checksums, provenance and installers on clean devices.
6. Confirm `/download` resolves the latest Windows installer.

The workflow can also be started manually for an existing `keep-v*` tag. It
never creates a release from an arbitrary branch or untagged commit.

## Android signing inputs (planned)

The Android job will use a Play App Signing upload keystore exposed only through
the protected environment. The first AAB must be registered manually in Play
Console; subsequent internal-track uploads can be automated through the Google
Play Developer API. Direct APK downloads and Play-distributed AABs must be built
from the same tag and signing identity.
