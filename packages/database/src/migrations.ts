import { getPrismaClient } from './connection';

export class MigrationRunner {
  private db = getPrismaClient();

  async runMigrations(): Promise<void> {
    console.log(
      'Prisma handles migrations automatically through prisma migrate.'
    );
    console.log('Use "npx prisma migrate dev" to create and apply migrations.');
    console.log(
      'Use "npx prisma db push" to push schema changes to the database.'
    );
  }

  async status(): Promise<void> {
    console.log('Use "npx prisma migrate status" to check migration status.');
  }
}
