const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "apps/web/app/(app)/tutorial/ProfileView.tsx",
  "apps/web/app/(app)/tutorial/FeedView.tsx",
  "apps/web/app/(app)/tutorial/EditProfileForm.tsx",
  "apps/web/app/admin/checkin/page.tsx",
  "apps/web/app/admin/page.tsx",
  "apps/web/app/admin/login/AdminLoginForm.tsx",
  "apps/web/app/scan/page.tsx",
  "apps/web/app/feedback/page.tsx",
  "apps/web/app/connections/page.tsx",
  "apps/web/app/components/AttendeeMenu.tsx",
  "apps/web/app/(auth)/login/LoginForm.tsx",
  "apps/web/app/(auth)/login/verify/VerifyStatus.tsx",
  "apps/web/app/(auth)/onboarding/OnboardingFlow.tsx",
  "apps/web/app/(admin)/admin/feed/page.tsx",
  "apps/web/app/(admin)/admin/import/page.tsx"
];

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Add import if needed
  const depth = file.split('/').length - 4; // apps/web/app is depth 0
  const relativePrefix = depth === 0 ? './lib/csrf' : '../'.repeat(depth) + 'lib/csrf';
  const importStatement = `import { withCsrfHeaders } from "${relativePrefix}";\n`;

  let needsImport = false;

  // regex to match fetch(...) that has method: "POST|PUT|PATCH|DELETE" or is known to mutate
  // We can just look for fetch(..., { ... credentials: "include" ... }) or fetch(..., { method: ... })
  // Since it's hard to parse AST with regex, we can replace specific patterns.

  // Let's replace: fetch(URL, { ... }) with fetch(URL, withCsrfHeaders({ ... }))
  // Only for calls we know are mutating.

  // 1. method: "POST"
  content = content.replace(/fetch\(([^,]+),\s*(\{\s*method:\s*["'](?:POST|PUT|PATCH|DELETE)["'][^\}]+\})\)/g, (match, url, init) => {
    needsImport = true;
    return `fetch(${url}, withCsrfHeaders(${init}))`;
  });
  
  // Also some might have nested objects like { method: "POST", headers: { ... } }
  // Regex might fail if there are nested braces.
  // It's safer to just do it manually if there are only ~20.
});
console.log('Use AST or manual');
