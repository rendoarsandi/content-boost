const fs = require('fs');
const path = require('path');

const files = [
  'apps/dashboard-app/app/api/campaigns/[id]/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/materials-access/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/apply/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/materials/[materialId]/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/materials/route.ts',
  'apps/dashboard-app/app/api/campaigns/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/applications/analytics/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/applications/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/applications/[applicationId]/route.ts',
  'apps/dashboard-app/app/api/campaigns/[id]/applications/bulk/route.ts',
  'apps/dashboard-app/app/api/campaigns/available/route.ts',
];

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace import statement
    content = content.replace(
      /import { auth } from '@repo\/auth\/server-only';/g,
      "import { getSession } from '@repo/auth/server-only';"
    );

    // Replace auth() calls
    content = content.replace(
      /const session = await auth\(\);/g,
      'const session = await getSession();'
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
});

console.log('Auth import fixes completed!');
