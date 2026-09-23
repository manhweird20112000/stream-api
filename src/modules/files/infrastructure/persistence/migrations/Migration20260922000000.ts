import { Migration } from '@mikro-orm/migrations';

export class Migration20260922000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table "stored_files" (
        "id" uuid not null,
        "owner_id" varchar(255) not null,
        "visibility" varchar(7) not null,
        "filename" varchar(255) not null,
        constraint "stored_files_pkey" primary key ("id"),
        constraint "stored_files_visibility_check" check ("visibility" in ('public', 'private'))
      );
    `);
    this.addSql(
      'create index "stored_files_owner_id_index" on "stored_files" ("owner_id");',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table "stored_files";');
  }
}
