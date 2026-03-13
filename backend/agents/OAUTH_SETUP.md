# Google OAuth — URLs to configure

Flask runs on **port 5001** (macOS AirPlay uses :5000).

The app works from **both** `http://localhost:3000` and `http://127.0.0.1:3000`. You must register **both** callback URLs in Google (exact strings).

## Google Cloud Console → Credentials → your OAuth client

### Authorized redirect URIs (add both)

```
http://127.0.0.1:5001/oauth/callback
http://localhost:5001/oauth/callback
```

### If client type is “Web application” — Authorized JavaScript origins (add both)

```
http://127.0.0.1:3000
http://localhost:3000
```

Save. Wait ~1 minute after saving.

## credentials.json

In `"redirect_uris"`, include both:

```json
"http://127.0.0.1:5001/oauth/callback",
"http://localhost:5001/oauth/callback"
```

## How it works

- Open app at **localhost:3000** → API calls go to **localhost:5001** → OAuth callback **localhost:5001** → cookie on `localhost` → POSTs work.
- Open app at **127.0.0.1:3000** → API **127.0.0.1:5001** → callback **127.0.0.1:5001** → cookie on `127.0.0.1` → POSTs work.

Do not mix in one session (e.g. log in from localhost then only use 127.0.0.1 without connecting again).
