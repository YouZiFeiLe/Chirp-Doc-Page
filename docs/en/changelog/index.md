# Changelog & Release Notes

This section documents the **design rationale, protocol mechanics, security boundaries, and verification results** for each Chirp feature upgrade and cross-platform improvement, mapped directly to its GitHub Release tag.

::: info Versioning Convention
Chirp releases follow **`YYYY.MM.DD-N`** (such as `2026.11.27-1`). Entries marked **Released** correspond to published [GitHub Releases](https://github.com/YouZiFeiLe/Chirp/releases); any entry marked **Planned** indicates aligned code and docs awaiting final tag publication.
:::

## Release Index

| Release Tag | Status | Date | Highlights | Scope |
| --- | --- | --- | --- | --- |
| [`2026.11.27-1`](/en/changelog/2026-11-27-1) | [Released](https://github.com/YouZiFeiLe/Chirp/releases/tag/2026.11.27-1) | 2026-11-27 | **Native Client Login Resumption & Local Unlock**: Cross-platform cold-launch login resumption backed by OS-authenticated local storage and V5 device signatures; adds GitHub repository links across clients and web portals. | Go Server · macOS · iOS · Android · Windows |

## How to Use These Notes

- **Members & Admins**: Read **Why This Changed & User Experience** and **Rollout & Compatibility** to see when relaunching triggers local biometric/Windows Hello unlock versus a full Passkey ceremony.
- **Self-Hosters**: Each release note specifies database and protocol compatibility (for `2026.11.27-1`, schema stays at `23` and auto-creates `client_login_resumptions` cleanly in place).
- **Developers & Auditors**: Inspect wire formats, cross-language test vectors, per-OS secure vault designs, and automated/device QA results with direct links to `YouZiFeiLe/Chirp` source files.
