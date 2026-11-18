import json,sys
sys.path.insert(0,'/workspace/facade-pm-app/tools')
from content import CATS,NEW
BASE="2026-11-01"; TODAY="2026-11-18"
cats=[];n=0
for cid,name,icon,items in CATS:
    its=[]
    for i,(t,d,f,p) in enumerate(items,1):
        its.append(dict(id=f"{cid}-{i:03d}",title=t,detail=d,frequency=f,priority=p,tags=[],added_on=BASE))
    cats.append(dict(id=cid,name=name,icon=icon,items=its))
for cid,t,d,f,p in NEW:
    c=next(c for c in cats if c["id"]==cid)
    c["items"].append(dict(id=f"{cid}-{len(c['items'])+1:03d}",title=t,detail=d,frequency=f,priority=p,tags=["new"],added_on=TODAY))
data=dict(app="Facade PM",version=2,last_updated=TODAY,categories=cats)
json.dump(data,open('/workspace/facade-pm-app/docs/data.json','w'),ensure_ascii=False,indent=1)
print(len(cats),sum(len(c["items"]) for c in cats))
from skills import MUST,GOOD
groups=[]
for gid,gname,lst in [("must","Must-have skills",MUST),("good","Baaki zaroori skills",GOOD)]:
    groups.append(dict(id=gid,name=gname,items=[dict(id=f"skill-{gid}-{i:03d}",name=n,area=a,why=w,how=h,added_on=BASE) for i,(a,n,w,h) in enumerate(lst,1)]))
groups[0]["items"].append(dict(id="skill-must-%03d"%(len(MUST)+1),name="Contract clause se counter karna",area="Commercial",why="Client penalty ya debit note lagaye to clause aur record ke saath counter karna PM ka sabse kaam ka skill hai.",how="Ek purane case (jaise Satya 3 EOT) ko clause, dates aur letters ke saath 1 page me likh ke practice karo.",added_on=TODAY))
data["skills"]=dict(title="PM Skills",groups=groups)
json.dump(data,open('/workspace/facade-pm-app/docs/data.json','w'),ensure_ascii=False,indent=1)
print("skills",sum(len(g["items"]) for g in groups))
