import subprocess, time, os, shutil, requests
SQLD="/tmp/sqld/libsql-server-x86_64-unknown-linux-gnu/sqld"
shutil.rmtree("/tmp/sqld_dg", ignore_errors=True); os.makedirs("/tmp/sqld_dg")
db=subprocess.Popen([SQLD,"--db-path","/tmp/sqld_dg/data.db","--http-listen-addr","127.0.0.1:8141"],stdout=open("/tmp/sqld_dg.log","w"),stderr=subprocess.STDOUT); time.sleep(3)
env=dict(os.environ, TURSO_DATABASE_URL="http://127.0.0.1:8141", AUTH_SECRET="dg-secret-0123456789-abcdefghijklmnopq", PLATFORM_ADMIN_PASSWORD="PlatformPass-2026")
app=subprocess.Popen(["./node_modules/.bin/next","start","-p","4202"],cwd="/home/claude/emr-saas",env=env,stdout=open("/tmp/dg_app.log","w"),stderr=subprocess.STDOUT)
try:
    for _ in range(40):
        try: requests.get("http://localhost:4202/api/auth/me",timeout=2); break
        except Exception: time.sleep(1)
    r=requests.post("http://localhost:4202/api/tenants", json={"name":"Alpha University","ownerName":"Alice","ownerEmail":"a@a.edu","ownerPassword":"OwnerPass-123"})
    print("status", r.status_code, r.text[:160])
    out=subprocess.run(["node","-e",'import("/home/claude/emr-saas/node_modules/@libsql/client/lib-esm/web.js").then(async m=>{const c=m.createClient({url:"http://127.0.0.1:8141"});const r=await c.execute("SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name");console.log(r.rows.map(x=>x.name).join("\\n"))})'],capture_output=True,text=True)
    print(out.stdout, out.stderr[:200])
finally:
    app.terminate(); db.terminate()
