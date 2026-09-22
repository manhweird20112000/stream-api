const path = require('path');
const { existsSync } = require('fs');

async function run() {
  const [module, fileName] = process.argv.slice(2);

  if (!module || !fileName) {
    console.error('❌ Usage: pnpm seed:run <module> <seederFile>');
    console.error('👉 Example: pnpm seed:run user create.seeder.js');
    console.error(
      'Seeder files are loaded from dist; pnpm seed:run builds the project first.',
    );
    process.exit(1);
  }

  const { MikroORM } = require('@mikro-orm/postgresql');
  const ormConfigModule = require('../mikro-orm.config');
  const ormConfig = ormConfigModule.default || ormConfigModule;

  const seederPath = path.join(
    __dirname,
    `../dist/modules/${module}/infrastructure/persistence/seeders/${fileName}`,
  );

  if (!existsSync(seederPath)) {
    console.error(`❌ Seeder file not found: ${seederPath}`);
    process.exit(1);
  }

  const seederModule = await import(seederPath);

  if (typeof seederModule.run !== 'function') {
    console.error(
      `❌ Seeder file must export a 'run(entityManager, orm)' function.`,
    );
    process.exit(1);
  }

  const orm = await MikroORM.init(ormConfig);

  try {
    await seederModule.run(orm.em.fork(), orm);
  } finally {
    await orm.close(true);
  }

  console.log(`✅ Seeder "${fileName}" from module "${module}" executed.`);
}

run().catch((error) => {
  console.error('❌ Seeder execution failed:', error);
  process.exit(1);
});
