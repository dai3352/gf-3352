export default {
  async fetch(request, env, ctx) {
    const upstreamHost = "scriptcat.org";
    const url = new URL(request.url);
    url.hostname = upstreamHost;

    const newReq = new Request(url.toString(), request);
    newReq.headers.set("Host", upstreamHost);
    newReq.headers.set("Referer", `https://${upstreamHost}/`);

    let res = await fetch(newReq);

    // 替换页面内链接，把 greasyfork.org 替换成你的worker域名
    const workerHost = request.headers.get("host");
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("text/html") || contentType.includes("application/javascript")) {
      let text = await res.text();
      text = text.replaceAll("dai3352.jsdai.workers.dev", workerHost);
      res = new Response(text, res);
    }
    return res;
  },
};
