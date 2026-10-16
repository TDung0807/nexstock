# NexStock

NestJS + Prisma (PostgreSQL) backend with Google SSO (OIDC) and JWT authentication.

## Tech stack

- **NestJS 12** (ESM) — HTTP framework
- **Prisma 7** + **PostgreSQL** (via `@prisma/adapter-pg`)
- **Passport** — `passport-google-oauth20` for Google login, `passport-jwt` for access/refresh tokens
- **google-auth-library** — verifies the Google `id_token` (OIDC)

## Features

- User CRUD (`/users`) — restricted to `ADMIN` role
- Google SSO login with OIDC `id_token` verification
- JWT access + refresh tokens; refresh tokens are hashed and stored in DB (revocable)
- Global auth guard (`@Public()` to opt out) + role-based authorization (`@Roles()`)
- Request validation (`ValidationPipe`), rate limiting (`@nestjs/throttler`), security headers (`helmet`), CORS

## Authentication flow (Google SSO)

```
Browser                Backend                         Google
   |  GET /auth/google     |                              |
   |---------------------->| 302 redirect to consent ---->|
   |                       |                              |
   |  user approves / denies consent                      |
   |<------------------------- 302 redirect to callback --|
   |  GET /auth/google/callback?code=... (or ?error=...)  |
   |---------------------->|  exchange code for tokens -->|
   |                       |<-- access_token + id_token --|
   |                       |  verify id_token (OIDC)      |
   |                       |  upsert user, issue JWTs     |
   |<-- { accessToken, refreshToken } --|
```

1. Frontend/browser hits `GET /auth/google`.
2. User is redirected to Google's consent screen.
   - If the user **denies**, Google redirects back with `?error=access_denied` and the backend returns `401`.
3. On approval, Google redirects to `GET /auth/google/callback` with an authorization `code`.
4. Passport exchanges the `code` for tokens; the backend **verifies the `id_token`** (signature, `aud`, `iss`, expiry, `email_verified`) via `google-auth-library`.
5. The user is created/linked by email + `googleId`, and the backend returns a JWT **access token** and **refresh token**.

### Tokens

| Token | Lifetime (default) | Use |
|-------|--------------------|-----|
| Access  | `JWT_ACCESS_TTL` (15m) | `Authorization: Bearer <accessToken>` on protected routes |
| Refresh | `JWT_REFRESH_TTL` (7d) | Sent as Bearer to `POST /auth/refresh` to get new tokens |

Refresh tokens are hashed (scrypt + salt) and stored on the user record, so they can be **rotated** on each refresh and **revoked** on logout.

### Error handling

- User denies consent → `401 Google login failed: access_denied`
- Invalid/expired `id_token` → `401 Invalid Google id_token`
- Expired access token → `401 Access token expired`
- Expired/invalid refresh token → `401`/`403`

## Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/auth/google` | — | Start Google login (redirects to Google) |
| GET  | `/auth/google/callback` | — | OAuth callback; returns `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | Bearer = refresh token | Rotate tokens |
| POST | `/auth/logout` | Bearer = access token | Revoke refresh token |
| GET  | `/auth/me` | Bearer = access token | Current user payload |

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST   | `/users` | Create user |
| GET    | `/users` | List users |
| GET    | `/users/:id` | Get user |
| PATCH  | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

## Microservice authentication

Every route requires a valid JWT access token by default — a global guard
(`JwtAuthGuard` via `APP_GUARD`) is applied app-wide. Routes that must stay open
are annotated with `@Public()` (e.g. `/auth/google`, `/auth/google/callback`,
`/auth/refresh`, `/auth/verify`, and the root health check).

### Authorization (RBAC)

Roles are `ADMIN` and `USER` (new users default to `USER`). Protect routes with
`@Roles(UserRole.ADMIN)`; a global `RolesGuard` enforces it after authentication.
The `/users` endpoints require `ADMIN`.

> Bootstrapping the first admin: new accounts are `USER`. Promote one directly in
> the database, e.g. `UPDATE users SET role = 'ADMIN' WHERE email = '...';`.

### Hardening

- `ValidationPipe` (whitelist + forbid unknown props) validates all request bodies.
- `@nestjs/throttler` limits requests (default 100 / 60s).
- `helmet` sets security headers; CORS is enabled in `main.ts`.


This user service is the **source of truth** for identity. Other services verify
tokens by calling it (centralized verification), so revoked/disabled users are
rejected immediately.

### `POST /auth/verify` (service-to-service)

- Protected by a shared key sent in the `x-internal-api-key` header (`INTERNAL_API_KEY`).
- Verifies the token signature/expiry **and** that the user still exists and is `ACTIVE`.

Request:
```http
POST /auth/verify
x-internal-api-key: <INTERNAL_API_KEY>
Content-Type: application/json

{ "token": "<end-user-access-token>" }
```

Response `200`:
```json
{ "valid": true, "sub": "<userId>", "email": "user@example.com", "role": "USER", "status": "ACTIVE" }
```

Invalid/expired token or inactive user → `401`.

### Example: guard in another service

A downstream service can forward the incoming bearer token to this endpoint:

```ts
const res = await fetch('http://user-service:3000/auth/verify', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-internal-api-key': process.env.INTERNAL_API_KEY!,
  },
  body: JSON.stringify({ token: bearerToken }),
});
if (!res.ok) throw new UnauthorizedException();
const user = await res.json(); // { valid, sub, email, status }
```

To add more verifiers (gRPC/TCP/message queue) later, expose the same
`AuthService.verifyAccessToken()` through an additional transport — the
verification logic stays in one place.

## Google OAuth setup

1. Open the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth client ID** of type **Web application**.
3. Add an **Authorized redirect URI** that matches `GOOGLE_CALLBACK_URL`:
   ```
   http://localhost:3000/auth/google/callback
   ```
4. Copy the **Client ID** and **Client Secret** into your `.env`.

## Environment variables

Secrets live in `.env` and are **never committed** (`.env` and `.env.example` are in `.gitignore`).
Copy the template and fill in values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Used by the Docker Postgres container |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Separate strong random secrets per token type |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token lifetimes (e.g. `15m`, `7d`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GOOGLE_CALLBACK_URL` | Must match the Authorized redirect URI in Google Console |
| `INTERNAL_API_KEY` | Shared key other services send (`x-internal-api-key`) to call `/auth/verify` |

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Run locally

Prerequisites: Node.js, [pnpm](https://pnpm.io/), Docker (for PostgreSQL).

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env   # then edit values

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply database migrations
pnpm prisma migrate dev

# 5. Start the app (watch mode)
pnpm start:dev
```

The API runs at `http://localhost:3000`.

Quick test: open `http://localhost:3000/auth/google` in a browser, complete the Google login, and you'll receive `{ accessToken, refreshToken }`.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Run in watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run compiled build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | End-to-end tests |
| `pnpm lint` | Lint with oxlint |
