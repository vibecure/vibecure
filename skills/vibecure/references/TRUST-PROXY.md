# Trust Proxy — Platform Reference

When Express runs behind a reverse proxy, `req.ip` returns the proxy's IP unless `trust proxy` is configured correctly. Misconfiguration defeats rate limiting in one of two ways depending on the deployment:

- **Fail closed (self-DoS)**: All clients resolve to the same proxy IP → everyone shares one rate limit bucket → legitimate users get throttled.
- **Fail open (bypass)**: Attacker injects a spoofed `X-Forwarded-For` header → rate limiter keys on the fake IP → limits are bypassed entirely.

Set `trust proxy` to the exact number of proxy hops for your platform.

**Never use `app.set('trust proxy', true)`** — it trusts any `X-Forwarded-For` value, letting attackers trivially spoof their IP (HackerOne #723974).

## Verified platform settings

Only platforms with official documentation confirming proxy hop count are listed. All others fall through to the default (`false`).

| Platform | Setting | Hops | Source |
|----------|---------|------|--------|
| Heroku | `app.set('trust proxy', 1)` | 1 | [HTTP Routing](https://devcenter.heroku.com/articles/http-routing) — single router between client and dyno |
| AWS ALB | `app.set('trust proxy', 1)` | 1 | [X-Forwarded Headers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html) — ALB appends single client IP entry |
| Vercel | `app.set('trust proxy', 1)` | 1 | [Request Headers](https://vercel.com/docs/headers/request-headers) — Vercel overwrites XFF with client IP only, does not forward external IPs |
| Docker + nginx | `app.set('trust proxy', 1)` | 1 | Single reverse proxy by architecture |
| Docker + traefik | `app.set('trust proxy', 1)` | 1 | Single reverse proxy by architecture |
| Docker + caddy | `app.set('trust proxy', 1)` | 1 | Single reverse proxy by architecture |
| Direct (no proxy) | `app.set('trust proxy', false)` | 0 | No reverse proxy |

**Default for unlisted platforms**: `app.set('trust proxy', false)` — safe fallback. The skill should note that the user needs to determine their platform's proxy hop count.

## Proprietary headers (alternative to X-Forwarded-For)

Some platforms provide their own client IP headers that bypass `X-Forwarded-For` spoofing. These can be used via `express-rate-limit`'s `keyGenerator` option as an alternative to trust proxy.

| Platform | Header | Trustworthy? | Source |
|----------|--------|-------------|--------|
| Cloudflare | `CF-Connecting-IP` | Yes — set by CF edge, not client-controllable | [Cloudflare Docs](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip) |
| Fly.io | `Fly-Client-IP` | Yes — set by Fly proxy | [Request Headers](https://fly.io/docs/networking/request-headers/) |
| AWS CloudFront | `CloudFront-Viewer-Address` | Yes — set from TCP connection by CloudFront (requires origin request policy opt-in) | [CloudFront Headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html) |

**Removed** (not trustworthy): Fastly `Fastly-Client-IP` — [Fastly's own docs](https://www.fastly.com/documentation/reference/http/http-headers/Fastly-Client-IP/) state the header is "not protected from modification at the edge" and clients can spoof it.
