# Managed Service Flow

When only managed services are detected (no direct paid API SDKs). Do NOT show phase headers (2/4, 3/4, etc.).

1. Read `{skill-dir}/lib/managed-services.md` for the detected service's coverage details.

2. Show:
   ```
   ── vibecure · scan complete ──

   SMS — [Provider] handles [list from platformHandled].
   ⚙️  Recommended: Enable [item] in [Provider] dashboard ([nav path]) — [risk in ≤10 words]
   ```

   No emoji on the first line — it is informational context (why certain checks were skipped).
   Only show ⚙️ lines if the service's `dashboardConfig` array in the prepare output is **non-empty**.
   If `dashboardConfig` is `[]`, do NOT show any ⚙️ lines.
   Show one ⚙️ line per dashboard item. Get the nav path from managed-services.md.
   The risk clause MUST include a dollar figure. Look up the check ID in the Economic Impact
   Reference table. If that row has a dollar amount, use it. If not (e.g. `no-captcha` says
   "multiplies all cost vectors"), use the domain's per-unit cost instead (SMS: $0.01–$0.50/SMS,
   Email: sender reputation, LLM: $0.002–$0.10+/call).
   Keep the risk clause brief (1 short sentence), appended after an em dash.

3. Silently run checks:
   - Universal checks (hardcoded credentials, broken auth identity) — always
   - Domain checks listed in the service's `devMustCode` array — these are controls
     the platform does NOT handle and the developer must implement in code

   Do NOT announce that you are running checks.

4. If findings exist, output **only** this block — nothing else:

   ```
   Found [N] issues.

   🔴 High · [first finding description]
      📁 [file] · line [N]
      [impact statement]

   🔴 High · [second finding description]
      📁 [file] · line [N]
      [impact statement]

   1. Fix all [N] issues now
   2. Walk me through each one
   3. Skip fixes
   ```

   Rules:
   - List ALL findings first, then show the fix menu ONCE at the end.
     NEVER put a menu after each individual finding.
   - Severity is ALWAYS High for managed-service findings. NEVER use Critical, even for
     country restriction or other checks that would be Critical in the full-scan flow.
     Managed services already provide partial protection — Critical overstates the risk.
   - Output NOTHING between the last finding's impact line and the numbered menu.

5. If no findings beyond the status line, show:
   ```
   No additional issues found.
   ```

   These are your billing & abuse risks.
   Go deeper: auth bypass · data leaks · session hijacking · injection
   👉 Free full scan → [vibecure.ai/scan](https://vibecure.ai/scan)

   Then stop.

Do NOT:
- Show `Detected services: ✗ SMS / ✗ Email / ✗ AI/LLM`
- Say "Running checks..." or narrate internal steps
- Explain what managed services are or add commentary outside the templates above
- Use ✅ or any other emoji on the managed-service status line
