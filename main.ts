import { Application, Status } from "jsr:@oak/oak/";
import { Router } from "jsr:@oak/oak/router";

const kv = await Deno.openKv();

const router = new Router();
router.get("/", (ctx) => {
  ctx.response.body = `<!DOCTYPE html>
    <html>
      <head><title>Ziplinks</title><head>
      <body>
        <h1>Meowdy</h1>
        <p>Create ziplinks easily to share links with friends.</p>
        <p>Each link will be hexed! Cursed to shrink down to a vulnerable and balding 4-digit code.</p>
        <p>Point at the puny urls and laugh!</p>
        <form action="/new" method="post">
          <input type="text" name="URL" placeholder="Enter URL" />
          <button type="submit">Ziplink!</button>
        </form>
      </body>
    </html>
  `;
});

router.post("/new", async (ctx) => {
  if (!ctx.request.hasBody) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: "Request body is missing." };
    return;
  }

  const body = ctx.request.body({ type: "form" });
  const value = await body.value;
  const longURL = value.get("URL");
  if (!longURL) {
    ctx.response.status = Status.BadRequest;
    ctx.response.body = { error: "URL is required." };
    return;
  }
  const slug = crypto.randomUUID().substring(0, 4);
  await kv.set(["urls", slug], longURL);
  console.log(`[New] ${slug.padStart(6)} ${Date.now()}`);
  const shortURL = `${ctx.request.url.origin}/${slug}`;
  ctx.response.status = Status.Created;
  ctx.response.headers.set("Content-Type", "text/html");
  ctx.response.body = `<!DOCTYPE html>
    <html>
      <head><title>Ziplink Created!</title></head>
      <body>
        <h1>Ziplink Created!</h1>
        <p>Your long URL: <a href="${longURL}">${longURL}</a></p>
        <p>Your ziplink: <a href="${shortURL}">${shortURL}</a></p>
      </body>
    </html>
  `;
});

router.get("/:slug", async (ctx) => {
  const slug = ctx.params.slug;
  if (slug.length !== 4) {
    ctx.response.status = Status.BadRequest;
    console.error(`[BadRequest] ${ctx.request.ip} ${Date.now()}`);
    return;
  }
  
  console.info(`[Requested] ${slug.padStart(6)} ${Date.now()}`);
  const entry = await kv.get(["urls", slug]);
  console.debug(`[Result] ${entry} ${Date.now()}`);
  
  if (entry.value === null) {
    console.warn(`[NotFound] ${slug.padStart(6)} ${Date.now()}`);
    ctx.response.status = Status.NotFound;
    return;
  };
  console.info(`[Found] ${slug.padStart(6)} ${Date.now()}`);
  ctx.response.status = Status.MovedPermanently;
  ctx.response.headers.set("Location", entry.value as string);
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8080 });
