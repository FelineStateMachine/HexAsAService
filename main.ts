import { Application, Status } from "jsr:@oak/oak/";
import { Router } from "jsr:@oak/oak/router";

const kv = await Deno.openKv();

const router = new Router();
router.get("/", (ctx) => {
  ctx.response.body = `<!DOCTYPE html>
    <html>
      <head><title>Hexlinks</title><head>
      <body>
        <h1>Meowdy</h1>
        <p>Hex your favorite link to easily share.</p>
        <p>Each link will be cursed to shrink down to a vulnerable, and balding, 4-digit code.</p>
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
    ctx.response.body = { error: "Spell, Hex, requires a target." };
    return;
  }
  const formData = await ctx.request.body.formData();
  const longURL = formData.get("URL");
  if (!URL.canParse(longURL)) {
    console.error(`[UnprocessableEntity] ${ctx.request.ip} ${Date.now()}`)
    ctx.response.status = Status.UnprocessableEntity;
    ctx.response.body = {error: "The hex fizzles on non-urls."};
    return;
  }
  
  const slug = crypto.randomUUID().substring(0, 4);
  await kv.set(["urls", slug], longURL);
  
  console.log(`[Created] ${slug.padStart(6)} ${Date.now()}`);
  
  ctx.response.headers.set("Location", `/${slug}`);
  ctx.response.status = Status.Created;
  ctx.response.body = { URL: longURL, hex: slug };
});

router.get("/:slug", async (ctx) => {
  const slug = ctx.params.slug;
  if (slug.length !== 4) {
    console.error(`[BadRequest] ${ctx.request.ip} ${Date.now()}`);
    ctx.response.status = Status.BadRequest;
    ctx.response.body = {error: "You ain't gotta do all that. Hexes that big don't exist!"};
    return;
  }
  
  console.log(`[Requested] ${slug.padStart(6)} ${Date.now()}`);
  
  const entry = await kv.get(["urls", slug]);
  if (entry.value === null) {
    console.warn(`[NotFound] ${slug.padStart(6)} ${Date.now()}`);
    ctx.response.status = Status.NotFound;
    ctx.response.body = {error: "Your URL is in another castle."};
    return;
  };
  
  console.log(`[Found] ${slug.padStart(6)} ${Date.now()}`);
  ctx.response.status = Status.MovedPermanently;
  ctx.response.headers.set("Location", entry.value as string);
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());
app.listen({ port: 8080 });
