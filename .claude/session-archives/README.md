# Claude Code session archives

Compressed JSONL transcripts of significant Claude Code sessions worked in this
repository. Each file captures every message, tool call, and tool result from a
single session — useful as a design-decision archive ("why did we choose X?")
that lives alongside the code.

## File format

```
YYYY-MM-DD_session-<uuid-prefix>.jsonl.gz
```

- Date is the session **start** date (when work began, not when archived)
- UUID prefix is the first 8 chars of the Claude Code session UUID
- `gzip` is used because raw JSONLs are typically 30–50 MB; gzipping cuts that
  to a few MB. Most of the size is base64-encoded screenshots inside tool
  results, which don't compress well — accept the ~3× ratio

## How to read a session back

```bash
# View the raw transcript
gunzip -c .claude/session-archives/2026-05-19_session-dfd62526.jsonl.gz | less

# Pretty-print just user messages
gunzip -c .claude/session-archives/2026-05-19_session-dfd62526.jsonl.gz \
  | jq 'select(.message.role == "user") | .message.content'

# Find all PRs opened in a session
gunzip -c .claude/session-archives/2026-05-19_session-dfd62526.jsonl.gz \
  | grep -oE 'https://github.com/[^/]+/[^/]+/pull/[0-9]+' | sort -u
```

## How to restore a session into Claude Code

Each Claude Code project keeps its session transcripts at:

```
~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl
```

To restore a session for `claude --resume`, decompress and copy it into that
project's directory:

```bash
SESSION_UUID=dfd62526-abbd-4418-b5a2-aeb72e757d0d
PROJ_DIR="$HOME/.claude/projects/-Volumes-Anthropic---Claude-AI-mediamtx-ui--claude-worktrees-magical-curie-e2c8ed"
mkdir -p "$PROJ_DIR"
gunzip -c .claude/session-archives/2026-05-19_session-dfd62526.jsonl.gz \
  > "$PROJ_DIR/${SESSION_UUID}.jsonl"
# Then: claude --resume
```

## What's archived here

| File | Notes |
|---|---|
| `2026-05-19_session-dfd62526.jsonl.gz` | The session that drove the full vanilla→React migration (PR #6), sunset of `server/public/` (PR #9), iframe theme wiring (PR #10), IoT dashboard redesign + screensaver + Settings tab (PR #11), and the Scrypted fork restyle (PR #41 on `iamjairo/manage-scrypted-app`). Started 2026-05-16, archived 2026-05-19. |
