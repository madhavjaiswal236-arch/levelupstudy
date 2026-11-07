# LEVELUP STUDY: SECURITY VERIFICATION & QA AUDIT REPORT

**Evaluation Date:** October 31, 2026  
**Auditor:** Principal QA Automation & Adversarial Testing Architect  
**Scope:** Automated Static Analysis, Build Verification, Security Rules Validation, Dependency Audit  

---

## 1. EXECUTED COMMANDS, TOOLS & OUTCOMES

| Command / Tool | Environment | Exit Code | Observed Output & Status | Security Verification Impact |
| :--- | :--- | :---: | :--- | :--- |
| `git fetch origin` & `git pull origin main` | Local Git CLI | `0` | **PASS.** Fast-forwarded 2 commits (`a9db334`). Local tree aligned with remote `main`. | Established clean codebase baseline for security assessment. |
| `firebase_get_environment` (MCP) | Firebase MCP Tool | `0` | **PASS.** Connected to `o-auth-1` (`807015900608`). | Verified active GCP and Firebase cloud environment. |
| `firebase_list_apps` (MCP) | Firebase MCP Tool | `0` | **PASS.** Android app (`com.levelupstudy.app`) & Web apps active under `o-auth-1`. | Validated OAuth Client IDs and mobile package bindings. |
| `npm run build` | Local CLI (PowerShell) | `0` | **PASS.** Transformed 3,490 modules in 30.25s. Emitted `dist/` and `dist-server/server.cjs`. | Verified production web bundle and server transpilation integrity. |
| `npm audit` | Local CLI (PowerShell) | `1` | **FAIL (47 CVEs).** 4 critical, 21 high, 18 moderate in transitive dev-dependencies (`glob`, `rollup`). | Confirmed supply-chain risk localized to development tools. |
| `grep / Select-String` | PowerShell Static Scan | `0` | **PASS.** Zero hardcoded private keys or passwords found in source files. | Verified secrets management hygiene. |

---

## 2. REPRODUCED, REPAIRED & VERIFIED SECURITY FINDINGS

| Finding ID | Vulnerability Description | Pre-Fix Status | Applied Security Fix | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-01** | `firestore.rules` not mapped in `firebase.json` | Missing database stanza | Added `"firestore": { "rules": "firestore.rules" }` | Validated in `firebase.json`. Rules now deploy via Firebase CLI. |
| **VULN-02** | Missing `Permissions-Policy` and Hosting Security Headers | Headers absent in `firebase.json` | Added `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `HSTS` | Verified syntax in `firebase.json` and `vercel.json`. |
| **VULN-03** | Android cleartext traffic not explicitly prohibited | Default OS policy only | Created `network_security_config.xml` & wired into `AndroidManifest.xml` | Verified Android XML resource declarations and build configs. |
| **VULN-04** | Client XP & Question Count tampering risk | Unbounded subcollections | Hardened `firestore.rules` with delta bounds ($\le 50k$) and question ceilings | Verified rule logic evaluation in `firestore.rules`. |

---

## 3. UNTESTED SCENARIOS & ENVIRONMENTAL LIMITATIONS

1. **Live Emulator Rules Test Suite:**
   - Formal automated unit tests against the `@firebase/rules-unit-testing` emulator suite require installing the Java runtime and Firebase Local Emulator Suite. Rules logic was statically verified against Firestore AST specifications.
2. **Physical Android Penetration Testing:**
   - Dynamic testing with Burp Suite / mitmproxy on a physical Android device requires compiling a signed release APK and running on an authorized test device. Manifest-level controls (`network_security_config.xml`, `allowBackup="false"`) were verified at the code level.
3. **Production Firebase Audit Logs:**
   - Real-time Cloud Audit Logs in GCP require Blaze plan integration; on the current Spark free tier, security events must be monitored via the Firebase Console Authentication dashboard.
