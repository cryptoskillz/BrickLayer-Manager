# Bricklayer Manager

The centralized dashboard for tracking and administering your statically generated Bricklayer sites.

## Features

- View all deployed Bricklayer sites via an elegant web UI.
- Automatically track and store Cloudflare Worker endpoints.
- Auto-generate deep links straight into the Cloudflare Dashboards for easy debugging.
- Secure, token-based API to accept and synchronize configurations from any CLI-managed Bricklayer project.

## Commands

- `npm run start` or `npm run dev`: Boot up the local manager development server (accessible via `http://localhost:8787`).
- `npm run build`: Recompile the Nunjucks HTML dashboard templates using Eleventy and Tailwind CSS.
- `npm run deploy`: Deploy the Bricklayer Manager itself to a Cloudflare Worker.

## Default Credentials

When booting up the manager for the first time, you can log in to the dashboard using the default credentials configured in your `wrangler.toml`:

- **Email**: `admin@example.com`
- **Password**: `password123`

*(Note: Once logged in, it's highly recommended to navigate to the **Settings** page and rotate your credentials for better security!)*
