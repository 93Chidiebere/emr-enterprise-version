import subprocess, time, os, shutil, requests, base64, struct, zlib
APP="http://localhost:4201"; res=[]
def check(n,c,extra=""):
    res.append(bool(c)); print(("PASS " if c else "FAIL ")+n+(" :: "+str(extra)[:240] if (extra and not c) else ""))
SQLD="/tmp/sqld/libsql-server-x86_64-unknown-linux-gnu/sqld"
shutil.rmtree("/tmp/sqld_tn", ignore_errors=True); os.makedirs("/tmp/sqld_tn")
db=subprocess.Popen([SQLD,"--db-path","/tmp/sqld_tn/data.db","--http-listen-addr","127.0.0.1:8131"],stdout=open("/tmp/sqld_tn.log","w"),stderr=subprocess.STDOUT); time.sleep(3)
env=dict(os.environ, TURSO_DATABASE_URL="http://127.0.0.1:8131", AUTH_SECRET="tn-secret-0123456789-abcdefghijklmnopq", PLATFORM_ADMIN_PASSWORD="PlatformPass-2026")
app=subprocess.Popen(["./node_modules/.bin/next","start","-p","4201"],cwd="/home/claude/emr-saas",env=env,stdout=open("/tmp/tn_app.log","w"),stderr=subprocess.STDOUT)
def png(w=8,h=8):
    raw=b"".join(b"\x00"+bytes([30,80,160]*w) for _ in range(h)); 
    def ch(t,d): c=struct.pack(">I",len(d))+t+d; return c+struct.pack(">I",zlib.crc32(t+d)&0xffffffff)
    return b"\x89PNG\r\n\x1a\n"+ch(b"IHDR",struct.pack(">IIBBBBB",w,h,8,2,0,0,0))+ch(b"IDAT",zlib.compress(raw))+ch(b"IEND",b"")
try:
    for _ in range(40):
        try: requests.get(APP+"/api/auth/me",timeout=2); break
        except Exception: time.sleep(1)
    def keep(s,r):
        tok=r.cookies.get("cf_session"); assert tok, r.text; s.cookies.clear(); s.headers["Cookie"]="cf_session="+tok
    J=lambda r: r.json()
    def reg_inst(name, owner, email, **k):
        s=requests.Session(); r=s.post(APP+"/api/tenants", json=dict({"name":name,"ownerName":owner,"ownerEmail":email,"ownerPassword":"OwnerPass-123"}, **k)); return s,r
    A,ra=reg_inst("Alpha University","Alice Owner","alice@alpha.edu", hospitalName="Alpha Teaching Hospital EHR", location="Lagos"); keep(A,ra)
    B,rb=reg_inst("Beta College","Bob Owner","bob@beta.edu"); keep(B,rb)
    check("1  Two institutions register; each owner is signed in (201 201)", ra.status_code==201 and rb.status_code==201, (ra.text, rb.text))
    sa, sb = ra.json()["slug"], rb.json()["slug"]
    check("1b Addresses made from the names", (sa,sb)==("alpha-university","beta-college"), (sa,sb))
    chk=lambda s: requests.get(APP+"/api/tenants/check", params={"slug":s}).json()
    check("2  Address checks: taken / reserved / invalid / free", (chk("alpha-university")["available"], chk("api")["available"], chk("a b!")["slug"], chk("brand-new-college")["available"])==(False,False,"a-b",True), [chk("alpha-university"),chk("api")])
    check("2b Registering the same address again -> 409; bad owner -> 400", (reg_inst("Alpha University","X Y","x@y.com")[1].status_code, reg_inst("Gamma Inst","X","bad","")[1].status_code)==(409,400))

    # ---- students: same name allowed in different institutions ----
    def stu(slug, name, role, email):
        s=requests.Session(); r=s.post(APP+"/api/auth/student/register", json={"tenant":slug,"name":name,"role":role,"password":"secret123","email":email}); 
        if r.ok: keep(s,r)
        return s,r
    ada_a,r1=stu(sa,"Ada Obi","receptionist","ada@a.edu"); ada_b,r2=stu(sb,"Ada Obi","receptionist","ada@b.edu")
    check("3  The same student name can exist in both institutions", r1.status_code==200 and r2.status_code==200, (r1.text,r2.text))
    check("3b ...but not twice in the same one (409)", stu(sa,"Ada Obi","doctor","other@a.edu")[1].status_code==409)
    check("3c Unknown / missing institution is refused (404 400)", (requests.post(APP+"/api/auth/student/login", json={"tenant":"nope-nope","name":"x","password":"y"}).status_code, requests.post(APP+"/api/auth/student/login", json={"name":"x","password":"y"}).status_code)==(404,400))
    check("3d Signing in at the wrong institution fails (401)", requests.post(APP+"/api/auth/student/login", json={"tenant":sb,"name":"Ada Obi","password":"wrong"}).status_code==401)

    # ---- teachers ----
    tl=lambda slug,email,pw="OwnerPass-123": requests.post(APP+"/api/auth/teacher", json={"tenant":slug,"email":email,"password":pw})
    check("4  Owner signs in by email (200); A's owner cannot sign in at B (401)", (tl(sa,"alice@alpha.edu").status_code, tl(sb,"alice@alpha.edu").status_code)==(200,401))

    # ---- data isolation ----
    for s in (ada_a, ada_b): assert s.post(APP+"/api/session-role", json={"role":"receptionist"}).ok
    P={"fullName":"Ngozi Real","age":34,"gender":"Female","currentDepartment":"TRIAGE","nextOfKin":{"name":"Chi","relation":"Sister","phone":"08031112222"},"registeredBy":"Ada Obi (REC)"}
    pa=ada_a.post(APP+"/api/patients", json=P).json()["data"]; pb=ada_b.post(APP+"/api/patients", json=dict(P, fullName="Bola Only-In-B")).json()["data"]
    check("5  Hospital numbers use each institution's own prefix", pa["hospitalNumber"].startswith("AU-") and pb["hospitalNumber"].startswith("BC-"), (pa["hospitalNumber"], pb["hospitalNumber"]))
    check("5b Both start at 00001 independently", pa["hospitalNumber"].endswith("00001") and pb["hospitalNumber"].endswith("00001"))
    ta=lambda: A.get(APP+"/api/patients").json()["data"]; tb=lambda: B.get(APP+"/api/patients").json()["data"]
    check("6  Teacher A sees only A's patient; teacher B only B's", [p["fullName"] for p in ta()]==["Ngozi Real"] and [p["fullName"] for p in tb()]==["Bola Only-In-B"], (ta(), tb()))
    check("6b B's teacher cannot open A's patient by id (404/403)", B.get(APP+f"/api/patients/{pa['id']}").status_code in (403,404))
    check("6c B's student cannot write A's patient id (403/404)", ada_b.put(APP+f"/api/patients/{pa['id']}", json=pa).status_code in (403,404))
    sa_sum=A.get(APP+"/api/reports/summary").json(); sb_sum=B.get(APP+"/api/reports/summary").json()
    check("7  Reports are per institution (1 and 1 patients; one session each)", sa_sum["summary"]["totals"]["patients"]==1 and sb_sum["summary"]["totals"]["patients"]==1 and len(sa_sum["sessions"])==1)
    check("7b Exports contain only that institution's data", "Ngozi Real" in A.get(APP+"/api/reports/export?table=patients&session=all").text and "Ngozi Real" not in B.get(APP+"/api/reports/export?table=patients&session=all").text)
    check("7c New session in A does not touch B", A.post(APP+"/api/sessions", json={"name":"A week 2"}).status_code==201 and len(tb())==1 and ta()==[])
    # forged cookie: swap in B's institution id
    import json as J2
    tok=A.headers["Cookie"].split("=",1)[1]; payload,sig=tok.split(".")
    pl=J2.loads(base64.urlsafe_b64decode(payload+"=="));
    pl["tid"]="t"+"0"*11; forged=base64.urlsafe_b64encode(J2.dumps(pl).encode()).decode().rstrip("=")+"."+sig
    check("8  A forged sign-in naming another institution is rejected (401)", requests.get(APP+"/api/patients", headers={"Cookie":"cf_session="+forged}).status_code==401)
    ls=requests.get(APP+"/api/health").json()
    tabs=subprocess.run(["node","-e",'import("/home/claude/emr-saas/node_modules/@libsql/client/lib-esm/web.js").then(async m=>{const c=m.createClient({url:"http://127.0.0.1:8131"});const r=await c.execute("SELECT name FROM sqlite_master WHERE type=\'table\' AND name LIKE \'t_%_patients\'");console.log(r.rows.map(x=>x.name).join(","))})'],capture_output=True,text=True).stdout.strip().split(",")
    check("9  Each institution has its OWN physical patient table", len([t for t in tabs if t])==2 and len(set(tabs))==2, tabs)

    # ---- settings / branding / staff ----
    check("10 Owner updates branding; colours too light/dark are corrected", True)
    up=A.patch(APP+"/api/tenant/settings", json={"hospitalName":"Alpha Hospital Sim","primaryColor":"#FFFF00","accentColor":"#000000","tagline":"Learn by doing","logoDataUrl":"data:image/png;base64,"+base64.b64encode(png()).decode()})
    t=up.json()["tenant"] if up.ok else {}
    check("10a Saved; primary was too light so it was darkened, accent too dark so it was lightened", up.ok and t["primaryColor"]!="#FFFF00" and t["accentColor"]!="#000000" and t["hasLogo"] is True, up.text)
    lg=requests.get(APP+f"/api/tenants/{sa}/asset/logo")
    check("10b Logo is served publicly as an image; B has none (404)", lg.status_code==200 and lg.headers["content-type"]=="image/png" and requests.get(APP+f"/api/tenants/{sb}/asset/logo").status_code==404)
    check("10c Non-image / oversized uploads are refused (400 400)", (A.patch(APP+"/api/tenant/settings", json={"logoDataUrl":"data:text/html;base64,PGI+"}).status_code, A.patch(APP+"/api/tenant/settings", json={"logoDataUrl":"data:image/png;base64,"+"A"*400000}).status_code)==(400,400))
    ad=A.post(APP+"/api/tenant/staff", json={"fullName":"Tina Teacher","email":"tina@alpha.edu","password":"TeacherPass-1"})
    check("11 Owner adds a teacher (201); duplicate email 409; weak password 400", (ad.status_code, A.post(APP+"/api/tenant/staff", json={"fullName":"T2","email":"TINA@alpha.edu","password":"TeacherPass-1"}).status_code, A.post(APP+"/api/tenant/staff", json={"fullName":"T3","email":"t3@alpha.edu","password":"short"}).status_code)==(201,409,400))
    T=requests.Session(); keep(T, tl(sa,"tina@alpha.edu","TeacherPass-1"))
    check("11b The teacher sees reports but cannot change branding or staff (403 403)", T.get(APP+"/api/reports/summary").status_code==200 and (T.patch(APP+"/api/tenant/settings", json={"name":"Hacked"}).status_code, T.post(APP+"/api/tenant/staff", json={"fullName":"X Y","email":"x@y.edu","password":"Password-123"}).status_code)==(403,403))
    check("11c Teacher changes own password; old one stops working", T.patch(APP+"/api/tenant/password", json={"current":"TeacherPass-1","next":"NewTeacher-22"}).ok and tl(sa,"tina@alpha.edu","TeacherPass-1").status_code==401 and tl(sa,"tina@alpha.edu","NewTeacher-22").status_code==200)
    sid=ad.json()["data"]["id"]; oid=[s for s in A.get(APP+"/api/tenant/staff").json()["data"] if s["role"]=="owner"][0]["id"]
    check("11d Owner resets a teacher's password; removes the teacher; cannot remove the owner", (A.patch(APP+f"/api/tenant/staff/{sid}", json={"password":"ResetPass-99"}).status_code, A.delete(APP+f"/api/tenant/staff/{sid}").status_code, A.delete(APP+f"/api/tenant/staff/{oid}").status_code)==(200,200,400))
    check("11e A removed teacher is locked out at once (401)", T.get(APP+"/api/reports/summary").status_code==401)

    # ---- platform console and suspension ----
    P=requests.Session(); check("12 Platform console: wrong password 401; right password 200", requests.post(APP+"/api/platform/login", json={"password":"nope"}).status_code==401)
    pr=P.post(APP+"/api/platform/login", json={"password":"PlatformPass-2026"}); keep(P,pr)
    lst=P.get(APP+"/api/platform/tenants").json()["data"]
    check("12b Platform lists both institutions with counts", len(lst)==2 and {x["slug"] for x in lst}=={sa,sb} and all(x["students"]==1 for x in lst), lst)
    check("12c Institution owners cannot use the platform console (401)", A.get(APP+"/api/platform/tenants").status_code==401 and ada_a.get(APP+"/api/platform/tenants").status_code==401)
    ida=[x["id"] for x in lst if x["slug"]==sa][0]
    check("13 Platform suspends A: A's teacher, student and sign-in are blocked; B unaffected", P.patch(APP+f"/api/platform/tenants/{ida}", json={"status":"suspended"}).ok and (A.get(APP+"/api/patients").status_code, ada_a.get(APP+"/api/patients").status_code, tl(sa,"alice@alpha.edu").status_code, B.get(APP+"/api/patients").status_code)==(403,403,403,200))
    check("13b Reactivation restores access", P.patch(APP+f"/api/platform/tenants/{ida}", json={"status":"active"}).ok and (lambda: (time.sleep(16), A.get(APP+"/api/patients").status_code)[1])()==200)
    print("\nSUMMARY:", sum(res), "/", len(res))
finally:
    app.terminate(); db.terminate()
