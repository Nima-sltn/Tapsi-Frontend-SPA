# Security Policy 🔒

## Security Objectives
The Tapsi Redesign project maintains a zero third-party client dependency model to minimize supply chain risks and attack surfaces.

## Measures Implemented
- **Content Security Policy (CSP)**: Enforces strict source restrictions (`script-src 'self'`, `style-src 'self'`, `default-src 'none'`).
- **Zero Third-Party Requests**: Verified via static audit to ensure no runtime resources leak to external CDNs.
- **Input Sanitization & Clamping**: User inputs are clamped against strict numerical and schema bounds before being processed or persisted.
- **Storage Isolation**: Local storage keys are namespaced and validated to prevent prototype poisoning or corrupted state.

## Reporting Vulnerabilities
If you identify a security issue, please contact the maintainer directly via email at `nimaso8228@gmail.com`. Please provide details and steps to reproduce.
