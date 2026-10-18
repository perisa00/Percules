"""Generate real, refreshable destination documents from the shared scene."""
import json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PUBLIC=ROOT/'public'
def route_definitions():
    source=(PUBLIC/'pages.js').read_text(encoding='utf-8')
    return json.loads(re.search(r'const routes=Object.freeze\((\{.*\})\);',source)[1])
def expected_pages():
    template=(PUBLIC/'index.html').read_text(encoding='utf-8')
    result={}
    for world,item in route_definitions().items():
        page=template.replace('<body>','<body data-entry-world="'+world+'" data-entry-loading="true" data-scene="system" data-world="'+world+'">')
        page=page.replace('</head>','<link rel="modulepreload" href="/solar.js?v=mobile-flight-1">\n</head>')
        page=re.sub(r'<title>.*?</title>','<title>'+item['title']+' — Percules Digital Studio</title>',page)
        page=re.sub(r'(<meta name="description" content=")[^"]*',lambda m:m[1]+item['description'],page)
        page=page.replace('rel="canonical" href="https://percules.rs/"','rel="canonical" href="https://percules.rs'+item['path']+'"')
        page=re.sub(r'(<h1 id="scene-title">).*?(</h1>)',lambda m:m[1]+item['title']+m[2],page)
        page=re.sub(r'(<p id="scene-description">).*?(</p>)',lambda m:m[1]+item['description']+m[2],page)
        page=page.replace('id="location">MLEČNI PUT','id="location">'+item['title'].upper())
        page=page.replace('id="location-index">01 / 03','id="location-index">02 / 03')
        page=page.replace('id="enter-solar"','id="enter-solar" hidden')
        page=re.sub(r'(<a[^>]*id="back-galaxy"[^>]*) hidden',r'\1',page)
        article=re.search(r'<article[^>]*data-content="'+item['content']+r'"[^>]*>.*?</article>',page,re.S)[0].replace(' hidden','',1)
        fallback='<noscript><section class="static-content"><p><a href="/">← Galaksija</a></p>'+article+'</section></noscript>'
        page=re.sub(r'<noscript>.*?</noscript>',lambda _:fallback,page,flags=re.S)
        result[item['path'].strip('/')+'/index.html']=page
    return result
def verify_pages():
    return [name for name,expected in expected_pages().items() if not (PUBLIC/name).is_file() or (PUBLIC/name).read_text(encoding='utf-8')!=expected]
if __name__=='__main__':
    if '--check' in sys.argv:
        missing=verify_pages()
        if missing:print('Stale destination pages: '+', '.join(missing));sys.exit(1)
    else:
        for name,content in expected_pages().items():
            target=PUBLIC/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(content,encoding='utf-8')
        urls=['https://percules.rs/']+['https://percules.rs'+d['path'] for d in route_definitions().values()]
        (PUBLIC/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>'+url+'</loc></url>\n' for url in urls)+'</urlset>\n',encoding='utf-8')
    print('Destination pages verified.')

