# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-01-31

### Added
- Professional metrics badges to README.
- Real-world "Expiring Invite Links" example to Quick Start.

### Fixed
- Resolved `react-hooks/purity` errors in the Explorer app.
- Added live-updating TTL countdowns in the UI.
- Fixed GitHub Actions permissions for automatic Release creation.
- Synced project structure and dependencies with `@hamzasaleemorg/convex-comments`.
- Committed generated types to ensure CI passes without a live deployment.

## [1.0.0] - 2026-01-31

### Added
- Initial release of the Convex KV Component.
- Hierarchical, ordered key-value storage.
- Time-To-Live (TTL) support for automatic expiration.
- Atomic operations with hierarchical isolation.
- Recursive prefix deletion with background batching.
- Typed client factory with `withPrefix` support.
- Interactive KV Explorer dashboard.
