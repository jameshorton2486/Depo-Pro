# Viewing Vercel Deployment Logs

## Quick Methods

### Method 1: Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Select your project: `depo-pro`

2. **View Deployment**
   - Click **Deployments** tab
   - Click on any deployment
   - Scroll down to **Build Logs** section
   - Or click **Runtime Logs** tab for runtime errors

3. **Filter Logs**
   - Use the search box to filter logs
   - Click on specific log entries for details

---

### Method 2: Vercel CLI (Command Line)

#### List Recent Deployments

```bash
vercel ls
```

This shows:
- Deployment URL
- Status
- Created date
- Branch/commit

#### Inspect Specific Deployment

**PowerShell (Windows):**
```powershell
# Get deployment URL from vercel ls first
vercel ls

# Then use the actual URL (not <deployment-url>)
vercel inspect depo-pro-abc123.vercel.app --logs
```

**Bash/Linux/Mac:**
```bash
vercel inspect depo-pro-abc123.vercel.app --logs
```

#### Get Deployment by ID

If you have a deployment ID:
```bash
vercel inspect <deployment-id> --logs
```

---

### Method 3: Vercel CLI - Real-time Logs

**Stream logs from production:**
```bash
vercel logs <deployment-url> --follow
```

**Stream logs from a specific function:**
```bash
vercel logs <deployment-url> --follow --function <function-name>
```

---

## Common Issues

### Issue: "Can't find the deployment"

**Cause:** Using wrong deployment URL or not in correct project context.

**Fix:**
1. List deployments first:
   ```bash
   vercel ls
   ```
2. Copy the exact URL from the output
3. Make sure you're in the correct project directory
4. Or specify project:
   ```bash
   vercel inspect <deployment-url> --logs --project depo-pro
   ```

### Issue: PowerShell Redirection Error

**Error:**
```
The '<' operator is reserved for future use.
```

**Cause:** PowerShell interprets `<deployment-url>` as a redirection operator.

**Fix:** Use actual deployment URL, not placeholder:
```powershell
# ❌ WRONG
vercel inspect <deployment-url> --logs

# ✅ CORRECT
vercel inspect depo-pro-abc123.vercel.app --logs
```

---

## Finding Your Deployment URL

### From Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Click on your project: `depo-pro`
3. Click **Deployments** tab
4. Click on any deployment
5. The URL is shown at the top, or in the **Domains** section

### From Vercel CLI

```bash
vercel ls
```

Output example:
```
PROJECT     URL                                    STATE     AGE
depo-pro    depo-pro-abc123.vercel.app            Ready     2m
```

---

## Viewing Specific Log Types

### Build Logs
- Shows errors during `npm install` and `npm run build`
- Includes TypeScript errors, ESLint warnings, etc.

### Runtime Logs
- Shows errors when the app is running
- Includes API route errors, database connection issues, etc.

### Function Logs
- Shows logs from specific API routes
- Useful for debugging API endpoints

---

## Quick Troubleshooting Commands

```bash
# List all deployments
vercel ls

# Get deployment details
vercel inspect <deployment-url>

# View logs
vercel inspect <deployment-url> --logs

# Stream live logs
vercel logs <deployment-url> --follow

# Check project info
vercel project ls
```

---

## Example: Debugging Build Failure

1. **List deployments:**
   ```bash
   vercel ls
   ```

2. **Find failed deployment URL:**
   ```
   depo-pro-xyz789.vercel.app    Error    5m
   ```

3. **View build logs:**
   ```bash
   vercel inspect depo-pro-xyz789.vercel.app --logs
   ```

4. **Look for error messages:**
   - `Error: Command "npm install" exited with 1`
   - `Missing required environment variable: DATABASE_URL`
   - TypeScript errors
   - ESLint warnings

5. **Fix the issue** (e.g., add missing env vars)

6. **Redeploy:**
   ```bash
   git push
   # Or
   vercel --prod
   ```

---

## Need Help?

If you can't find your deployment:
1. Check you're logged in: `vercel whoami`
2. Check project: `vercel project ls`
3. Link project: `vercel link` (if not already linked)
4. View from dashboard instead (easiest method)



