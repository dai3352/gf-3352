// Cloudflare Worker 反向代理 GreasyFork
const TARGET_HOST = 'greasyfork.org';
const TARGET_URL = `https://${TARGET_HOST}`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const targetUrl = `${TARGET_URL}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set('Host', TARGET_HOST);

    const requestOptions = {
      method: request.method,
      headers: headers,
      redirect: 'manual', // 手动处理重定向，避免循环
    };

    const response = await fetch(targetUrl, requestOptions);

    // 处理重定向
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('Location');
      if (location && !location.startsWith(TARGET_HOST)) {
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        // 将重定向目标中的 greasyfork.org 替换为当前 Worker 域名
        const newLocation = location.replaceAll(TARGET_HOST, url.host);
        responseHeaders.set('Location', newLocation);
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } else {
        return new Response('重定向被阻止', { status: 200 });
      }
    }

    // 处理正常响应
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('X-Frame-Options');

    // 关键：将 HTML/JS/CSS 中的 greasyfork.org 替换为 Worker 域名，防止跳回源站
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('text/css')) {
      let body = await response.text();
      body = body.replaceAll(`https://${TARGET_HOST}`, `https://${url.host}`);
      body = body.replaceAll(`//${TARGET_HOST}`, `//${url.host}`);
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`代理失败: ${error.message}`, { status: 500 });
  }
}
