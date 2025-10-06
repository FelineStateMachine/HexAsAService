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
        <!-- TODO: Forum with one text input for the url and a submit button to post the data to /new -->
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

  const body = ctx.request.body({ type: "json" });
  const data = await body.value;
  console.debug("[Body]", data);
  const longURL = data.URL;
  const slug = crypto.randomUUID().substring(0, 4);
  const result = await kv.set(["urls", slug], longURL);
  console.log(`[New] ${slug.padStart(6)} ${Date.now()}`);
  ctx.response.status = Status.Created;
  ctx.response.headers.set("Location", `/${slug}`);
  ctx.response.body = { Destination: longURL };
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
  ctx.response.headers.set("Location", "https://www.youtube.com/");
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8080 });
