# Bricklayer Manager

The centralized dashboard for tracking and administering your statically generated Bricklayer sites.

## Features

- View all deployed Bricklayer sites via an elegant web UI.
- Automatically track and store Cloudflare Worker endpoints.
- Auto-generate deep links straight into the Cloudflare Dashboards for easy debugging.
- Secure, token-based API to accept and synchronize configurations from any CLI-managed Bricklayer project.

## Setup & Deployment

Before you can deploy the Manager to Cloudflare, you must create a KV Namespace to securely store your site configurations and authentication settings.

**1. Create the KV Namespace**
Run the following Wrangler command in your terminal:
```bash
npx wrangler kv:namespace create "BRICKLAYER_SITES"
```

**2. Update your `wrangler.toml`**
Wrangler will output a binding configuration that looks like this:
```toml
[[kv_namespaces]]
binding = "BRICKLAYER_SITES"
id = "YOUR_NEW_NAMESPACE_ID"
```
Copy that output and replace the placeholder `[[kv_namespaces]]` block in your `wrangler.toml` file.

**3. Deploy**
Once configured, deploy the manager to production:
```bash
npm run deploy:prod
```

## Commands

- `npm run start` or `npm run dev`: Boot up the local manager development server (accessible via `http://localhost:8787`).
- `npm run build`: Recompile the Nunjucks HTML dashboard templates using Eleventy and Tailwind CSS.
- `npm run deploy:prod`: Deploy the Bricklayer Manager to a Cloudflare Worker.

## Default Credentials

When booting up the manager for the first time, you can log in to the dashboard using the default credentials configured in your `wrangler.toml`:

- **Email**: `admin@example.com`
- **Password**: `password123`

*(Note: Once logged in, it's highly recommended to navigate to the **Settings** page and rotate your credentials for better security!)*
