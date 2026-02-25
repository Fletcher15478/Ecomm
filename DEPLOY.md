# Deploy to Render (pre-production / sandbox)

Use this guide to put the app on GitHub and deploy to Render with **Square sandbox** and **all products marked out of stock**. No real payments; all API keys stay private.

---

## 1. Keep secrets out of GitHub

- **Never commit** `.env`, `.env.local`, or any file containing real keys.
- Your `.gitignore` already excludes:
  - `.env`
  - `.env.local`
  - `.env.development.local`
  - `.env.test.local`
  - `.env.production.local`
- Before the first push, confirm no env file is staged:
  ```bash
  git status
  # You should NOT see .env or .env.local
  ```

---

## 2. GitHub setup

### Create a repo

1. On GitHub: **New repository** (e.g. `Ecomm` or `millies-ecomm`). Don’t add a README if the project already has one.
2. (Optional) Make it **private** until you’re ready for production.

### Push your code

From your project folder (e.g. `Desktop/Ecomm`):

```bash
cd /Users/fletc/Desktop/Ecomm

# If this isn’t a git repo yet:
git init
git add .
git status   # again: no .env or .env.local
git commit -m "Initial commit for Render deploy"

# Add GitHub as remote (replace with your repo URL):
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push (main or master, depending on your default):
git branch -M main
git push -u origin main
```

Only **code** and **.env.example** (no secrets) go to GitHub. All real values go in Render’s environment.

---

## 3. Environment variables (what the app needs)

Use these in **Render → Environment** and keep them **private** (no `NEXT_PUBLIC_*` in logs; Render doesn’t print secret env vars).

### Required (no defaults)

| Variable | Secret? | Where to get it | Notes |
|----------|--------|------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | No (public) | Supabase → Project Settings → API | e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (public) | Same → anon public key | Safe for client |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Same → service_role key | Server only; never expose |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | No | Square Developer Dashboard → App → Sandbox | Sandbox app ID |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | No | Square → Locations → Sandbox location ID | Sandbox location |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | No | Set to `sandbox` | Keeps checkout in sandbox |
| `SQUARE_ACCESS_TOKEN` | **Yes** | Square → Credentials → Sandbox → Access token | Sandbox only for pre-prod |
| `SQUARE_ENVIRONMENT` | No | Set to `sandbox` | Must match Square dashboard |
| `NEXT_PUBLIC_APP_URL` | No | Your Render URL | e.g. `https://your-app-name.onrender.com` (no trailing slash) |

### Optional but recommended

| Variable | Secret? | Notes |
|----------|--------|--------|
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | **Yes** | From Square webhook subscription; use Render URL as endpoint |
| `ORDER_NOTIFY_EMAILS` | No | Comma-separated emails for order notifications |
| `EMAIL_FROM` | No | Sender address for emails |
| `EMAIL_REPLY_TO` | No | Reply-to address |
| `RESEND_API_KEY` | **Yes** | If using Resend for email |
| Or Gmail SMTP: `USE_SMTP_GMAIL=1`, `SMTP_USER`, `SMTP_APP_PASSWORD` | **Yes** for password | Alternative to Resend |

**Pre-production:** Use **Square sandbox** credentials only. Set both `SQUARE_ENVIRONMENT` and `NEXT_PUBLIC_SQUARE_ENVIRONMENT` to `sandbox`.

---

## 4. Render setup

### Create the Web Service

1. [Render](https://render.com) → **New → Web Service**.
2. Connect your **GitHub** account and select the **repository** you pushed.
3. Configure:
   - **Name:** e.g. `millies-ecomm`
   - **Region:** pick one close to you or your users
   - **Branch:** `main` (or your default)
   - **Runtime:** **Node**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance type:** Free (or paid if you need no spin-down)

### Add environment variables

In the same service: **Environment** tab:

1. Add every variable from the table above (and any optional ones you use).
2. For **secret** vars, use **Secret** type so Render doesn’t show them in logs.
3. Set **`NEXT_PUBLIC_APP_URL`** to your Render URL, e.g.  
   `https://millies-ecomm.onrender.com` (no trailing slash).  
   Render shows the URL after the first deploy; you can add/update it then and redeploy.

### Deploy

Click **Create Web Service**. Render will clone the repo, run `npm install && npm run build`, then `npm start`. First deploy may take a few minutes.

After deploy, set **`NEXT_PUBLIC_APP_URL`** to the real URL if you used a placeholder, then redeploy once.

---

## 5. Square webhook (optional for pre-prod)

If you want order/webhook events on Render:

1. Square Developer Dashboard → **Webhooks** → add subscription.
2. **Endpoint URL:** `https://YOUR-RENDER-URL.onrender.com/api/webhooks/square`
3. Subscribe to the events you use (e.g. order created).
4. Copy the **Signature Key** into Render as **`SQUARE_WEBHOOK_SIGNATURE_KEY`** (secret).
5. Redeploy so the new env var is picked up.

---

## 6. Mark everything out of stock (sandbox / pre-prod)

So the storefront shows nothing for sale while you still use Square sandbox:

1. Open **Supabase** → **SQL Editor**.
2. Run:
   ```sql
   UPDATE store_product_settings SET is_out_of_stock = true;
   ```
3. If you add new products later, either run the same again or mark new rows in admin.

The app uses `store_product_settings.is_out_of_stock` to hide “Add to cart” and show out-of-stock; Square sandbox catalog stays as-is.

---

## 7. Checklist before go-live

- [ ] Repo on GitHub with **no** `.env` or `.env.local` committed.
- [ ] All env vars set in Render; secrets marked **Secret**.
- [ ] `SQUARE_ENVIRONMENT` and `NEXT_PUBLIC_SQUARE_ENVIRONMENT` = `sandbox`.
- [ ] `NEXT_PUBLIC_APP_URL` = your Render URL (no trailing slash).
- [ ] Supabase migrations applied (you already use Supabase; same project is fine).
- [ ] Ran `UPDATE store_product_settings SET is_out_of_stock = true` in Supabase for pre-prod.
- [ ] (Optional) Webhook URL and `SQUARE_WEBHOOK_SIGNATURE_KEY` set for Render.

When you’re ready for **production**, switch to Square production app/location/tokens, set `SQUARE_ENVIRONMENT` and `NEXT_PUBLIC_SQUARE_ENVIRONMENT` to `production`, and flip products back in stock in admin or via SQL.
