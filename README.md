# Mailspring Classic Inboxes

A fork of [Mailspring-classic-inbox](https://github.com/EmaX093/Mailspring-classic-inbox) by [EmaX093 (Emanuel Gianico)](https://github.com/EmaX093), who built the original plugin and deserves the credit for the idea and foundation.

DISCLAIMER: This plugin may have unexpected behavior. The authors hold no responsibility for any issues caused. Feedback and bug reports are welcome!

Mailspring plugin for people who prefer a classic, per-account mailbox sidebar instead of a unified inbox workflow.

This plugin replaces the default account sidebar and renders:

- Standard folders (Inbox, Sent, Drafts, Archive, Spam, Trash)
- All IMAP folders (including custom and nested folders)
- Hierarchical tree with collapse/expand behavior
- Drag and drop to move conversations between folders
- Context menus to create, rename, and delete folders

## What this fork adds

- **Nested subfolders of special folders.** Subfolders of Inbox, Trash, and other role folders now nest under their parent in the tree. This fixes the flat `Inbox/XYZ` display with Outlook / Office 365 accounts, where IMAP reports the inbox as `INBOX` but prefixes children with `Inbox/` (matching is case-insensitive on the real role path).
- **Collapsible accounts.** Each account section has a disclosure arrow on its header; click to collapse or expand the whole account.
- **Drag and drop account reordering.** Drag an account header to reorder accounts, with an insertion indicator showing exactly where it will land. Order persists via Mailspring's account settings.
- **Full folder management.** Right-click any standard folder (including Inbox) for New Subfolder, the account header for New Folder, and custom folders for New Subfolder / Rename / Delete. Renames preserve the parent path. Right-clicking focuses the folder like a left click.
- **Proper sidebar replacement.** The stock account sidebar is unregistered on activate (and restored on deactivate) instead of only being hidden with CSS.
- **Theme-aware UI.** Colors come from theme variables instead of hardcoded light values, the sidebar uses Mailspring's ScrollRegion for theme-styled scrollbars, and dialogs use standard `btn` classes, so dark themes render correctly throughout.

## Why this plugin exists

If unified inbox is not your style, this plugin gives a more traditional mailbox experience with clear folder structure by account.

## Installation

1. Copy this plugin folder to your Mailspring packages directory.
2. Install dependencies:

```bash
npm install
```

3. Build:

```bash
npm run build
```

4. Restart Mailspring (or reload the main window from dev tools).

## Development

Source files live in `src/` and compile to `lib/`.

```bash
npm run build
```

## Notes

- Keep `lib/` committed for distribution.
- Plugin targets the main Mailspring window (`windowTypes.default`).

## Credits

- Original plugin by [EmaX093 (Emanuel Gianico)](https://github.com/EmaX093/Mailspring-classic-inbox)
- Fork maintained by [exp0logy](https://github.com/exp0logy)
