export default {
  async fetch(request, env, ctx) {
    const targetHost = "scriptcat.org";
    const reqUrl = new URL(request.url);
    reqUrl.hostname = targetHost;

    const proxyReq = new Request(reqUrl.toString(), request);
    proxyReq.headers.set("Host", targetHost);
    proxyReq.headers.delete("Origin");

    const resp = await fetch(proxyReq);
    const workerHost = request.headers.get("host");
    const contentType = resp.headers.get("content-type") || "";

    // 只处理html、js文本内容，替换域名；图片、css、静态资源直接透传，避免二进制损坏
    if (/text\/html|application\/javascript/.test(contentType)) {
      let bodyText = await resp.text();
      // 替换页面内所有 greasyfork.org 为你的worker域名
      bodyText = bodyText.replaceAll("dai3352.jsdai.workers.dev", workerHost);
      return new Response(bodyText, resp);
    }
    return resp;
  }
};
