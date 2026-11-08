# Tests for the enterprise (multi-tenant) platform

These are black-box scripts that start a real local libSQL server (`sqld`, the engine behind Turso), build and
start the app, and call it over HTTP. They contain paths from the machine where they were written; edit these
before running:

| In the script | Change to |
|---|---|
| `SQLD="/tmp/sqld/libsql-server-x86_64-unknown-linux-gnu/sqld"` | the path of your `sqld` binary (see ENTERPRISE_HANDOFF_GUIDE.md, section 14) |
| `cwd="/home/claude/emr-saas"` | the folder of this project |
| `/home/claude/emr-saas/node_modules/@libsql/client/lib-esm/web.js` (inside a `node -e`) | `<your project>/node_modules/@libsql/client/lib-esm/web.js` |

Run order: `npm ci && npm run build`, then `python tests/tenant_api_test.py`. Requires Python 3 with `requests`.

* `tenant_api_test.py` - the multi-institution isolation and security suite (about 40 checks). STATUS: written, but it has
  NOT been run since the table-scoping bug was fixed. Running it and fixing what fails is the first task.
* `register_one_tenant_smoke.py` - registers one institution and lists the tables that were created. STATUS: passes.
