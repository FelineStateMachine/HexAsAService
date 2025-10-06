## Hex As a Service
- This is a basic URL shortener.
- It caps at 62^4 URLs and does not check for collision.
- The URL is stored in a KV store indexed by the slug.
- Permanent redirect caches locally the long url for subsequent visits.
- Logging is kept to exclusively meta-data about requests.
- Served static HTML to allow for easy shortening.
