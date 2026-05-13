# Bricklayer Manager

The centralized dashboard for tracking, configuring, and administering your statically generated Bricklayer sites.

## Features

- **Centralized Dashboard**: View and manage all deployed Bricklayer sites via an elegant, responsive web UI.
- **Site Configuration**: Edit project URLs, set production domains, and track financial metrics (License, Build, and Hosting costs) per site.
- **D1 Database Storage**: Robust relational data storage using Cloudflare D1 for sites, users, and global settings.
- **Role-Based Access Control**: Granular permissions via Admin, Editor, and Viewer roles.
- **Authentication**: Secure JWT-based sessions, an automated "Forgot Password" email flow, and native **GitHub OAuth** integration.
- **Email Routing Integration**: Native Cloudflare `cloudflare:email` support for sending user invites and password reset links.
- **Deep Linking**: Auto-generate deep links straight into the Cloudflare Dashboards for easy site debugging.

## Setup & Deployment

Bricklayer Manager requires a Cloudflare D1 Database to store its data. 

**1. Create the D1 Database**
Run the following Wrangler command in your terminal:
```bash
npx wrangler d1 create "bricklayer-db"
```

**2. Update your `wrangler.toml`**
Wrangler will output a binding configuration that contains a `database_id`. Update your `wrangler.toml` with this newly generated ID:
```toml
[[d1_databases]]
binding = "BRICKLAYER_DB"
database_name = "bricklayer-db"
database_id = "YOUR_NEW_DATABASE_ID"
```

**3. Apply the Database Schema**
Initialize the database tables by executing the SQL schema remotely:
```bash
npx wrangler d1 execute BRICKLAYER_DB --remote --file=./schema.sql
```

**4. Deploy**
Once configured, build the frontend and deploy the manager to production:
```bash
npm run deploy:prod
```

## Commands

- `npm run start` or `npm run dev`: Boot up the local manager development server (accessible via `http://localhost:8787`).
- `npm run build`: Recompile the Nunjucks HTML dashboard templates using Eleventy and Tailwind CSS.
- `npm run deploy:prod`: Build frontend assets and deploy the Bricklayer Manager to a Cloudflare Worker.

## Default Credentials

When booting up the manager for the first time, you can log in to the dashboard using the default credentials configured in your `wrangler.toml`:

- **Email**: `admin@example.com`
- **Password**: `password123`

*(Note: Once logged in, it's highly recommended to navigate to the **Settings** page and rotate your credentials for better security!)*
