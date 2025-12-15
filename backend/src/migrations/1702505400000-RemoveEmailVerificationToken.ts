import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveEmailVerificationToken1702505400000 implements MigrationInterface {
  name = 'RemoveEmailVerificationToken1702505400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('user_accounts');
    if (!hasTable) {
      return;
    }
    const hasColumn = await queryRunner.hasColumn(
      'user_accounts',
      'email_verification_token'
    );
    if (hasColumn) {
      await queryRunner.dropColumn('user_accounts', 'email_verification_token');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('user_accounts');
    if (!hasTable) {
      return;
    }
    const hasColumn = await queryRunner.hasColumn(
      'user_accounts',
      'email_verification_token'
    );
    if (!hasColumn) {
      await queryRunner.addColumn(
        'user_accounts',
        new TableColumn({
          name: 'email_verification_token',
          type: 'varchar',
          isNullable: true,
        })
      );
    }
  }
}
