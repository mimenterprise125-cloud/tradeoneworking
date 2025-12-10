# OAuth Configuration Verification Checklist

Use this checklist to verify all parts of your OAuth setup are correct.

## Part 1: Google Cloud Console Setup

Go to: https://console.cloud.google.com/

- [ ] Project is selected
- [ ] Go to: APIs & Services → Credentials
- [ ] Click your OAuth 2.0 Client ID
- [ ] Verify **Authorized Redirect URIs** contains:
  ```
  https://jabzseuicykmvfedxbwn.supabase.co/auth/v1/callback
  ```
- [ ] Verify **Authorized JavaScript Origins** contains:
  ```
  https://tradeone.vercel.app
  ```
  (or localhost:5173 for local dev)
- [ ] Note your **Client ID** and **Client Secret**

## Part 2: Supabase Dashboard Setup

Go to: https://app.supabase.com/

### Google OAuth Provider Configuration

- [ ] Select your project
- [ ] Go to: Authentication → Providers → Google
- [ ] Toggle is: **ENABLED** ✅
- [ ] **Client ID** field is filled with your Google Client ID
- [ ] **Client Secret** field is filled with your Google Client Secret

### Supabase URL Configuration

- [ ] Go to: Authentication → URL Configuration
- [ ] **Site URL** is set to:
  ```
  https://tradeone.vercel.app
  ```

- [ ] **Redirect URLs** section contains ALL of these:
  ```
  https://tradeone.vercel.app
  https://tradeone.vercel.app/#/auth/callback
  https://tradeone.vercel.app/#/dashboard/journal
  ```
  (Do NOT include URLs without the #)

## Part 3: Your Application Code

### Verify Login.tsx

File: `src/pages/Login.tsx` around line 51

```typescript
options: { redirectTo: getOAuthRedirectUrl('/auth/callback') }
```

- [ ] The `redirectTo` uses `/auth/callback` (NOT `/dashboard/journal`)
- [ ] Uses `getOAuthRedirectUrl()` function

### Verify Signup.tsx

File: `src/pages/Signup.tsx` around line 126

```typescript
options: { redirectTo: getOAuthRedirectUrl('/auth/callback') }
```

- [ ] The `redirectTo` uses `/auth/callback` (NOT `/dashboard/journal`)
- [ ] Uses `getOAuthRedirectUrl()` function

### Verify AuthCallback Component

File: `src/pages/auth/callback.tsx`

- [ ] Route exists in `App.tsx`: `<Route path="/auth/callback" element={<AuthCallback />} />`
- [ ] Component checks session: `if (data.session) { navigate('/dashboard/journal') }`
- [ ] Component has loading state while checking session

### Verify auth-helpers.ts

File: `src/lib/auth-helpers.ts`

```typescript
return `${cleanDomain}/#${path}`;
```

- [ ] The function adds `#` before the path
- [ ] Handles both `VITE_OAUTH_REDIRECT_DOMAIN` and `window.location.origin`

### Verify .env (Production)

File: `.env`

- [ ] `VITE_SUPABASE_URL=https://jabzseuicykmvfedxbwn.supabase.co` ✅
- [ ] `VITE_SUPABASE_ANON_KEY=...` (your actual key) ✅
- [ ] `VITE_OAUTH_REDIRECT_DOMAIN=https://tradeone.vercel.app` ✅
- [ ] `VITE_GOOGLE_CLIENT_ID=...` (your actual ID) ✅

### Verify vercel.json (NEW)

File: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

- [ ] File exists in project root
- [ ] `buildCommand` is set to `npm run build`
- [ ] `outputDirectory` is set to `dist`

## Part 4: Vercel Deployment

Go to: https://vercel.com/

- [ ] Project is deployed and shows "READY" status
- [ ] Environment variables are set:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_OAUTH_REDIRECT_DOMAIN`
  - [ ] `VITE_GOOGLE_CLIENT_ID`

## Part 5: Test the Flow

Before testing, clear your browser cache:

1. **Clear Browser Cache**
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "All time"
   - Check "Cookies and other site data"
   - Click "Clear data"

2. **Test on Production**
   - Open: `https://tradeone.vercel.app/`
   - Click "Sign in with Google"
   - Complete Google login
   - Watch the URL bar:
     - Should show: `https://tradeone.vercel.app/#/auth/callback` (briefly)
     - Should show: `https://tradeone.vercel.app/#/dashboard/journal` (final)
   - Should see dashboard with your trading data

3. **Check Browser Console**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any error messages
   - Should see: "✅ Auth successful" message

4. **Check Network Tab**
   - Open DevTools (F12)
   - Go to Network tab
   - Refresh page
   - Click "Sign in with Google"
   - Look for requests to:
     - `accounts.google.com` ✅
     - `supabase.co/auth/v1/callback` ✅
   - All should have status 200 or 301 (redirects)
   - None should show 404

## Troubleshooting Steps

### If Getting 404 Error

1. **Check the exact error message:**
   - Open DevTools (F12)
   - Go to Console tab
   - Share the full error URL that's returning 404

2. **Verify Supabase Redirect URLs:**
   - Go to Supabase → URL Configuration
   - Make sure ALL URLs contain `#` symbol
   - Example: `https://tradeone.vercel.app/#/auth/callback`

3. **Check Vercel Deployment:**
   - Go to Vercel → Your Project → Deployments
   - Make sure latest deployment is "READY"
   - If not ready, wait for it to finish

4. **Clear Everything:**
   - Clear browser cache
   - Clear cookies
   - Hard refresh (`Ctrl+Shift+R`)
   - Try again

### If Getting "Redirect URI Mismatch"

1. The exact URL in Supabase doesn't match what code is using
2. Go to Supabase URL Configuration
3. Make sure URLs are EXACTLY as shown (case-sensitive)
4. Save and wait 30 seconds

### If User Not Authenticated After Redirect

1. Session might not have been created
2. Check Supabase logs: Go to Supabase → Home → Logs
3. Look for any errors in the auth logs
4. Make sure Google OAuth credentials are correct in Supabase

## Success Indicators ✅

When everything is set up correctly:

- ✅ Clicking Google button takes you to Google login
- ✅ After Google login, you see loading page at `/#/auth/callback`
- ✅ Then redirected to dashboard at `/#/dashboard/journal`
- ✅ Dashboard shows your trading data
- ✅ You can create journal entries
- ✅ Logging out and back in works smoothly

---

**If you check all these boxes and it still doesn't work, please share:**
1. The exact error message (with URL)
2. What you see in the browser console
3. A screenshot of your Supabase URL Configuration
4. Your `.env` file (redact sensitive keys)
