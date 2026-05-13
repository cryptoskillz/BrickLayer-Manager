# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Database Migration**: Completely transitioned data storage architecture from Cloudflare KV to Cloudflare D1 (SQL) for enhanced query capabilities and relational integrity (`users`, `sites`, `settings`, and `reset_tokens` tables).
- **User Management & RBAC**: Added a comprehensive `/users` dashboard supporting role-based access control (Admin, Editor, Viewer). Includes modal forms to securely add, edit, and delete users.
- **Site Configuration**: Implemented editing capabilities for connected Bricklayer sites. Users can now assign Project URLs, manage Production URLs, and track financial costs (Build Cost, Monthly Hosting, License).
- **Email Integration**: Integrated Cloudflare's native `cloudflare:email` module. The system now automatically dispatches secure email invitations for new users and handles password reset links.
- **Forgot Password Flow**: Built out a complete forgot/reset password UI and backend logic utilizing secure, time-expiring tokens.
- **GitHub OAuth**: Added a "Sign In with GitHub" alternative flow, dynamically configured via the Manager's Settings panel.
- **UI Improvements**: Refined the authentication screens with a unified light-mode aesthetic, implemented toggleable "Eye" icons for password visibility, and added inline validation for confirming passwords.

### Removed
- **KV Store Dependencies**: Removed all traces of the legacy `BRICKLAYER_SITES` KV bindings from the configuration and backend APIs.
