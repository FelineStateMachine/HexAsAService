import { Application, Status } from "jsr:@oak/oak/";
import { Router } from "jsr:@oak/oak/router";

const kv = await Deno.openKv();

const router = new Router();
router.get("/", (ctx) => {
  ctx.response.body = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hex As a Service</title>
    <style>
        :root {
            --background-color: #121212;
            --form-background: #1e1e1e;
            --input-background: #2a2a2a;
            --button-background: #9f7aea;
            --button-hover-background: #805ad5;
            --text-color: #e2e8f0;
            --placeholder-color: #718096;
            --border-color: #4a5568;
            --focus-ring-color: rgba(159, 122, 234, 0.25);
            --shadow-color: rgba(0, 0, 0, 0.25);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            height: 100%;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            background-color: var(--background-color);
            color: var(--text-color);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .form-container {
            width: 100%;
            max-width: 500px;
            background-color: var(--form-background);
            padding: 2.5rem;
            border-radius: 16px;
            border: 1px solid var(--border-color);
            box-shadow: 0 8px 32px var(--shadow-color);
            text-align: center;
        }

        h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: var(--button-background);
        }

        p {
            margin-bottom: 2rem;
            color: var(--placeholder-color);
        }

        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .url-input {
            width: 100%;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: var(--input-background);
            font-size: 1rem;
            color: var(--text-color);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .url-input::placeholder {
            color: var(--placeholder-color);
        }

        .url-input:focus {
            outline: none;
            border-color: var(--button-background);
            box-shadow: 0 0 0 4px var(--focus-ring-color);
        }
        
        .submit-button {
            width: 100%;
            padding: 1rem;
            border: none;
            border-radius: 8px;
            background-color: var(--button-background);
            color: white;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.1s ease;
        }

        .submit-button:hover {
            background-color: var(--button-hover-background);
        }

        .submit-button:active {
            transform: scale(0.98);
        }

        .submit-button {
            display: none;
        }

        .url-input:not(:placeholder-shown) + .submit-button {
            display: block;
        }
    </style>
</head>
<body>

    <div class="form-container">
        <h1>Meowdy, Mortal</h1>
        <p>Condense any URL into a 4-digit hex code.</p>
        
        <form action="/new" method="post">
            <input 
                type="url" 
                name="url" 
                class="url-input" 
                placeholder="Hex a URL" 
                required
            >
            <button type="submit" class="submit-button">Hex It</button>
        </form>
    </div>

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
  const longURL = formData.get("url");
  if (!URL.canParse(longURL)) {
    console.error(`[UnprocessableEntity] ${Date.now()}`)
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
    console.error(`[BadRequest] ${Date.now()}`);
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
