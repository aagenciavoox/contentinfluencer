import { readFileSync, writeFileSync } from 'fs';

const pages = [
  'src/features/settings/pages/SettingsPage.tsx',
  'src/features/settings/pages/PlatformsSettingsPage.tsx',
  'src/features/settings/pages/ProfileSettingsPage.tsx',
  'src/features/settings/pages/LooksSettingsPage.tsx',
  'src/features/settings/pages/PostingTimesSettingsPage.tsx',
  'src/features/settings/pages/TemplatesSettingsPage.tsx',
  'src/features/projects/pages/ProjectDetailPage.tsx',
  'src/features/recording/pages/RecordingPage.tsx',
];

for (const rel of pages) {
  let content = readFileSync(rel, 'utf8');
  if (content.includes('PageLayout')) continue;

  if (!content.includes("from '../../../layouts/page/PageLayout'")) {
    content = content.replace(
      /import \{ DesktopPageHeader \} from '\.\.\/\.\.\/\.\.\/layouts\/page\/DesktopPageHeader';/,
      "import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';\nimport { PageLayout } from '../../../layouts/page/PageLayout';"
    );
  }

  // Pattern A: header in sticky wrapper
  content = content.replace(
    /<div className="min-h-screen bg-\[var\(--bg-secondary\)\]">\s*<header className="desktop-header-sticky[^"]*">\s*<div className="desktop-header-frame[^"]*">\s*([\s\S]*?)<\/div>\s*<\/header>\s*<div className="desktop-content-frame([^"]*)">/,
    '<PageLayout variant="settings" contentClassName="$1" header={$2}>'
  );

  // Pattern B: simple header frame
  content = content.replace(
    /<div className="min-h-screen bg-\[var\(--bg-secondary\)\]">\s*<div className="desktop-header-frame">\s*([\s\S]*?)<\/div>\s*<div className="desktop-content-frame([^"]*)">/,
    '<PageLayout variant="settings" contentClassName="$2" header={$1}>'
  );

  // Close
  content = content.replace(
    /<\/div>\s*<\/div>\s*\);\s*\n\}\s*$/,
    '</PageLayout>\n  );\n}\n'
  );

  writeFileSync(rel, content);
  console.log('Updated', rel);
}
