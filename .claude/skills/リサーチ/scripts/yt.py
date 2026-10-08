import json, urllib.request, time
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
CTX={"client":{"clientName":"WEB","clientVersion":"2.20251001.00.00","hl":"ja","gl":"JP"}}
def post(ep, body, tries=3):
    body={"context":CTX, **body}
    for i in range(tries):
        try:
            req=urllib.request.Request(f"https://youtubei.googleapis.com/youtubei/v1/{ep}?prettyPrint=false",
                data=json.dumps(body).encode(), headers={"Content-Type":"application/json","User-Agent":UA,"Accept-Language":"ja","X-Youtube-Client-Name":"1","X-Youtube-Client-Version":CTX["client"]["clientVersion"]})
            return json.load(urllib.request.urlopen(req, timeout=60))
        except Exception as e:
            if i==tries-1: raise
            time.sleep(2*(i+1))
def walk(o, key):
    """yield all dict values under given key anywhere"""
    if isinstance(o, dict):
        for k,v in o.items():
            if k==key: yield v
            yield from walk(v,key)
    elif isinstance(o, list):
        for v in o: yield from walk(v,key)
