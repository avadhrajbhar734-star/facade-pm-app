"""Naye items data.json me jodne ke liye (weekly update).
Usage: python3 tools/add_items.py new.json
new.json format:
{"items":[{"category":"daily","title":"...","detail":"...","frequency":"Daily","priority":"High"}],
 "skills":[{"group":"must","name":"...","area":"Technical","why":"...","how":"..."}],
 "new_categories":[{"id":"x","name":"...","icon":"📌"}],
 "templates":[{"id":"t_x","name":"...","lang":"English","subject":"...","body":"Dear {{Client}} ..."}]}
added_on = aaj ki date, id auto, version +1, last_updated = aaj. Phir git commit + push.
"""
import json,sys,datetime
P='docs/data.json';T=datetime.date.today().isoformat()
d=json.load(open(P));n=json.load(open(sys.argv[1]))
for c in n.get("new_categories",[]):  # {"id","name","icon"}
    d["categories"].append(dict(c,items=[]))
for t in n.get("templates",[]):  # {"id","name","lang","subject","body"} - {{Field}} placeholders
    t["added_on"]=T;d.setdefault("templates",[])
    d["templates"]=[x for x in d["templates"] if x["id"]!=t["id"]]+[t]
for it in n.get("items",[]):
    cid=it.pop("category");c=next(c for c in d["categories"] if c["id"]==cid)
    it.setdefault("tags",[]);it["added_on"]=T;it["id"]=f'{c["id"]}-{len(c["items"])+1:03d}'
    while any(x["id"]==it["id"] for x in c["items"]): it["id"]+="b"
    c["items"].append(it)
for s in n.get("skills",[]):
    gid=s.pop("group");g=next(g for g in d["skills"]["groups"] if g["id"]==gid)
    s["added_on"]=T;s["id"]=f'skill-{g["id"]}-{len(g["items"])+1:03d}';g["items"].append(s)
d["version"]+=1;d["last_updated"]=T
json.dump(d,open(P,'w'),ensure_ascii=False,indent=1)
print("v",d["version"],sum(len(c["items"]) for c in d["categories"]),"items")
