const { execFileSync } = require('child_process');
const path = require('path');

const [moduleName, migrationName] = process.argv.slice(2);
const packageManager = process.env.npm_execpath || 'pnpm';

if (!moduleName || !migrationName) {
  console.error('❌ Migration invalid');
  process.exit(1);
}

const migrationDir = path.join(
  'src',
  'modules',
  moduleName,
  'infrastructure',
  'persistence',
  'migrations',
);

try {
  console.log('Building project before reading MikroORM entities...');
  execFileSync(packageManager, ['build'], { stdio: 'inherit' });

  console.log(`📦  Migration creating...`);
  execFileSync(
    packageManager,
    [
      'mikro-orm',
      'migration:create',
      '--path',
      migrationDir,
      '--name',
      migrationName,
    ],
    { stdio: 'inherit' },
  );
  console.log('✅  Migration created.');
} catch (error) {
  console.error('❌  Error  migration:', error.message);
  process.exit(1);
}
