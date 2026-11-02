const TARGET = 'https://greasyfork.org';
const PROXY  = 'https://dai3352.jsdai.workers.dev'; // 改成你的域名

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set('host', 'greasyfork.org');
    headers.delete('cf-connecting-ip');
    headers.delete('x-forwarded-for');

    const resp = await fetch(TARGET + url.pathname + url.search, {
      method: request.method,
      headers,
      body: ['GET','HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    const h = new Headers(resp.headers);
    // 重定向改写
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get('location');
      if (loc) {
        const u = new URL(loc, TARGET);
        h.set('location', u.host === 'greasyfork.org'
          ? PROXY + u.pathname + u.search : loc);
      }
    }
    // Cookie 去掉 Domain，登录态才能在代理域名生效
    h.delete('set-cookie');
    for (const c of resp.headers.getSetCookie?.() ?? []) {
      h.append('set-cookie', c.replace(/;\s*Domain=greasyfork\.org/gi, ''));
    }
    h.delete('content-security-policy');
    h.delete('strict-transport-security');

    const type = resp.headers.get('content-type') || '';
    if (type.includes('text/html') || type.includes('text/css')) {
      let t = await resp.text();
      t = t.replaceAll('https://greasyfork.org', PROXY)
           .replaceAll('http://greasyfork.org', PROXY)
           .replaceAll('//greasyfork.org', '//' + new URL(PROXY).host);
      return new Response(t, { status: resp.status, headers: h });
    }
    return new Response(resp.body, { status: resp.status, headers: h });
  },
};
