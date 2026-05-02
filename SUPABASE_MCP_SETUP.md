# Supabase MCP setup

This project ships with `.mcp.json` configured for the official Supabase MCP server. Once set up, Claude Code can read the schema, run migrations, and inspect the database directly.

## One-time setup

### 1. Get a Supabase Personal Access Token (PAT)

1. Visit https://supabase.com/dashboard/account/tokens
2. Click **Generate new token**, name it `claude-code-feaster`
3. Copy the token (shown once)

### 2. Get your project ref

From your Supabase project URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`

Or run `supabase projects list` if you have the CLI.

### 3. Set environment variables

**Windows PowerShell (persist across sessions):**

```powershell
[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "sbp_your_token_here", "User")
[Environment]::SetEnvironmentVariable("SUPABASE_PROJECT_REF", "your_project_ref", "User")
```

Close and reopen any terminal so the new env vars are picked up.

**Bash / zsh / WSL** — add to `~/.bashrc` or `~/.zshrc`:

```sh
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
export SUPABASE_PROJECT_REF="your_project_ref"
```

### 4. Restart Claude Code

MCP servers load at startup. Quit the Claude Code app/CLI completely and reopen it from the project directory. You'll be prompted once to approve the new MCP server.

### 5. Verify

In a new Claude Code session, ask:

> "list all tables in the database"

If it works, you'll see Claude call `mcp__supabase__list_tables` and return your schema.

## What features are enabled

The config uses `--features=database,development,docs`:

- **database** — query data, list tables, run migrations, list extensions
- **development** — fetch URL + anon key, generate TypeScript types
- **docs** — search Supabase docs inline

Excluded by default: `account` (project listing), `branching`, `edge_functions`, `storage`, `debugging`. Add them to `.mcp.json` if you need them.

## Security notes

- The token has **full write access** to your Supabase project. Treat it like a password.
- `.mcp.json` is committed; it references env vars, not literal secrets.
- For multi-developer projects, each developer sets their own `SUPABASE_ACCESS_TOKEN` — Supabase's audit log will show whose token ran a query.
- If you want **read-only mode**, add `--read-only` to the args in `.mcp.json`. This is recommended for production project refs.

## Running migrations through the MCP

Once active, ask Claude to run any of:

```
supabase/migrations/20260502000000_marketplace_extensions.sql
supabase/migrations/20260502000100_security_hardening.sql
supabase/migrations/20260502000200_critical_security_fixes.sql
supabase/migrations/20260502000300_pin_server_side_and_rate_limits.sql
```

Claude will call `mcp__supabase__apply_migration` for each one and report success/failure.

## Troubleshooting

- **"Failed to connect to MCP server supabase"** — token or project ref env var is unset, or you didn't restart Claude Code.
- **"Permission denied"** — the PAT has expired or was revoked. Generate a new one.
- **MCP tools don't appear** — ensure you opened Claude Code from this project's directory so it picks up `.mcp.json`. Run `claude mcp list` to verify.
