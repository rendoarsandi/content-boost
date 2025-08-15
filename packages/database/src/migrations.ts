import { getPrismaClient } from './db';

export class MigrationRunner {
  private db = getPrismaClient();

  async runMigrations(): Promise<void> {
    console.log('Supabase handles migrations through the dashboard or CLI.');
    console.log('Use "supabase migration new" to create new migrations.');
    console.log(
      'Use "supabase db push" to push schema changes to the database.'
    );
  }

  async status(): Promise<void> {
    console.log('Use "supabase migration list" to check migration status.');
  }
}
