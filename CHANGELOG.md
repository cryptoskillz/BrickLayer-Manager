# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Associated URLs Tracker**: Added a dynamic feature to the Site Management cards to track arbitrary 3rd-party URLs (e.g., custom CMS endpoints, analytics dashboards). Integrates a responsive "Manage URLs" modal and serializes data to a new `associated_urls` column in the D1 `sites` table.
- **Granular RBAC & User Status**: The User Management table now evaluates account statuses (Active, Pending) based on the presence of passwords or active invite tokens. Added UI components to copy secure invite links directly and checkboxes to manage granular module permissions and explicit site array assignments.

### Changed
- **Finance Report Accuracy**: Overhauled the Finance logic and UI to explicitly distinguish between "Income" and "Expense" types. The dashboard now accurately calculates and displays "Total Income," "Total Expenses," and net profit/loss ("Net Balance"), complete with color-coded badges and updated CSV export columns.

### Added
- **Finance Dashboard**: Added a comprehensive "Finance Report" dashboard that calculates total outstanding and paid costs across all properties. Includes advanced filtering by Site, Report View (Monthly, Yearly, Comprehensive), Target Month, Target Year, and Payment Status.
- **Automated Recurring Costings**: Built a Cloudflare Cron (`scheduled`) task that runs daily to automatically invoice active `Monthly` and `Yearly` subscriptions. Expired instances are cleanly archived into historical `One Time` records.
- **Robust CLI Sync Integration**: Upgraded the `POST /api/sites` endpoint to safely handle incoming payload data from the `bricklayer manage` CLI without throwing ReferenceErrors, ensuring reliable synchronisation of frontend and CMS URLs.
- **Improved UX for Costing Form**: Rebuilt the Costing Management modal with responsive flex grids and an explicit Date picker for logging retroactive expenses.

- **Database Migration**: Completely transitioned data storage architecture from Cloudflare KV to Cloudflare D1 (SQL) for enhanced query capabilities and relational integrity (`users`, `sites`, `settings`, and `reset_tokens` tables).
- **User Management & RBAC**: Added a comprehensive `/users` dashboard supporting role-based access control (Admin, Editor, Viewer). Includes modal forms to securely add, edit, and delete users.
- **Site Configuration**: Implemented editing capabilities for connected Bricklayer sites. Users can now assign Project URLs, manage Production URLs, and track financial costs (Build Cost, Monthly Hosting, License).
- **Email Integration**: Integrated Cloudflare's native `cloudflare:email` module. The system now automatically dispatches secure email invitations for new users and handles password reset links.
- **Forgot Password Flow**: Built out a complete forgot/reset password UI and backend logic utilizing secure, time-expiring tokens.
- **GitHub OAuth**: Added a "Sign In with GitHub" alternative flow, dynamically configured via the Manager's Settings panel.
- **UI Improvements**: Refined the authentication screens with a unified light-mode aesthetic, implemented toggleable "Eye" icons for password visibility, and added inline validation for confirming passwords.

### Removed
- **KV Store Dependencies**: Removed all traces of the legacy `BRICKLAYER_SITES` KV bindings from the configuration and backend APIs.
