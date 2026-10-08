import json, re, time
from yt import post, walk
VIDEOS="EgZ2aWRlb3PyBgQKAjoA"; SHORTS="EgZzaG9ydHPyBgUKA5oBAA%3D%3D"
def parse_views(s):
    if not s: return None
    s=s.replace(",","").replace(" ","")
    m=re.search(r"([\d.]+)(億|万)?",s)
    if not m: return None
    n=float(m.group(1)); u=m.group(2)
    return int(n*(10**8 if u=="億" else 10**4 if u=="万" else 1))
def parse_age_days(s):
    if not s: return None
    m=re.search(r"(\d+)\s*(秒|分|時間|日|週間|か月|ヶ月|年)前",s)
    if not m: return None
    n=int(m.group(1)); u=m.group(2)
    return {"秒":0,"分":0,"時間":n/24,"日":n,"週間":n*7,"か月":n*30,"ヶ月":n*30,"年":n*365}[u] if u not in("秒","分") else 0
def header(cid):
    r=post("browse",{"browseId":cid})
    h=r.get("header",{}); out={"title":None,"handle":None,"subs":None,"count":None,"tabs":[]}
    for m in walk(h,"contentMetadataViewModel"):
        for row in m.get("metadataRows",[]):
            for p in row.get("metadataParts",[]):
                t=p.get("text",{}).get("content","")
                if t.startswith("@"): out["handle"]=t
                elif "登録者" in t: out["subs"]=t
                elif "本の動画" in t: out["count"]=t
    for t in walk(h,"dynamicTextViewModel"):
        out["title"]=out["title"] or t.get("text",{}).get("content")
    out["title"]=out["title"] or r.get("metadata",{}).get("channelMetadataRenderer",{}).get("title")
    out["tabs"]=[t.get("title") for t in walk(r,"tabRenderer")]
    return out
def items_from(r):
    out=[]
    for l in walk(r,"lockupViewModel"):
        vid=l.get("contentId"); md=l.get("metadata",{}).get("lockupMetadataViewModel",{})
        title=md.get("title",{}).get("content")
        rows=[p.get("text",{}).get("content") for row in md.get("metadata",{}).get("contentMetadataViewModel",{}).get("metadataRows",[]) for p in row.get("metadataParts",[])]
        views=next((x for x in rows if x and "回視聴" in x),None); pub=next((x for x in rows if x and x.endswith("前")),None)
        length=None
        for b in walk(l.get("contentImage",{}),"thumbnailBadgeViewModel"):
            if re.match(r"^[\d:]+$",b.get("text","")): length=b["text"]
        if vid: out.append({"videoId":vid,"title":title,"views":views,"viewCount":parse_views(views),"published":pub,"ageDays":parse_age_days(pub),"length":length,"kind":"video"})
    for s in walk(r,"shortsLockupViewModel"):
        vid=s.get("onTap",{}).get("innertubeCommand",{}).get("reelWatchEndpoint",{}).get("videoId")
        om=s.get("overlayMetadata",{}); views=om.get("secondaryText",{}).get("content")
        if vid: out.append({"videoId":vid,"title":om.get("primaryText",{}).get("content"),"views":views,"viewCount":parse_views(views),"published":None,"ageDays":None,"length":None,"kind":"short"})
    return out
def tab(cid, params, sort=None, max_items=60):
    r=post("browse",{"browseId":cid,"params":params})
    want={VIDEOS:"動画",SHORTS:"ショート"}.get(params)
    sel=[t.get("title") for t in walk(r,"tabRenderer") if t.get("selected")]
    if want and sel and sel[0]!=want: return None
    if sort:
        tok=None
        for c in walk(r,"chipViewModel"):
            if c.get("text")==sort: tok=c.get("tapCommand",{}).get("innertubeCommand",{}).get("continuationCommand",{}).get("token")
        if not tok: return None
        r=post("browse",{"continuation":tok})
    items=[]; seen=set()
    def add(r):
        n=0
        for i in items_from(r):
            if i["videoId"] not in seen: seen.add(i["videoId"]); items.append(i); n+=1
        return n
    add(r)
    while len(items)<max_items:
        toks=[c.get("continuationEndpoint",{}).get("continuationCommand",{}).get("token") for c in walk(r,"continuationItemRenderer")]
        toks=[t for t in toks if t]
        if not toks: break
        r=post("browse",{"continuation":toks[0]})
        if add(r)==0: break
        time.sleep(0.3)
    return items[:max_items]
