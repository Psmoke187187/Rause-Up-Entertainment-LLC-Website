#!/usr/bin/env python3
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen, Request

HOST = 'http://localhost:8000/'

class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'href' in attrs:
            self.links.add(attrs['href'])
        if tag in ('img', 'script') and 'src' in attrs:
            self.links.add(attrs['src'])
        if tag == 'link' and attrs.get('rel') == 'stylesheet' and 'href' in attrs:
            self.links.add(attrs['href'])

def fetch(url):
    try:
        req = Request(url, headers={'User-Agent':'link-checker/1.0'})
        with urlopen(req, timeout=5) as r:
            return r.getcode(), r.read()
    except Exception as e:
        return None, str(e).encode()

def check_page(path):
    url = urljoin(HOST, path)
    code, body = fetch(url)
    print(f'GET {url} -> {code}')
    if body and code and str(code).startswith('2'):
        p = LinkParser()
        try:
            p.feed(body.decode(errors='ignore'))
        except Exception:
            pass
        for link in sorted(p.links):
            if link.startswith('mailto:') or link.startswith('tel:') or link.startswith('#'):
                continue
            full = urljoin(url, link)
            if urlparse(full).netloc != urlparse(HOST).netloc:
                print(f'  SKIP external: {full}')
                continue
            c, _ = fetch(full)
            print(f'  {link} -> {c}')

def main():
    pages = ['index.html', 'beats.html', 'packs.html']
    for p in pages:
        check_page(p)

if __name__ == '__main__':
    main()
