import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilmsHallsAndShowings1795036990054 implements MigrationInterface {
  name = 'CreateFilmsHallsAndShowings1795036990054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "halls" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(255) NOT NULL, "rows" integer NOT NULL, "seats_per_row" integer NOT NULL, CONSTRAINT "UQ_46711ac8c7003abe9f974263bfb" UNIQUE ("name"), CONSTRAINT "PK_4665c2f3b1e718e12b06278bae8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "showings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "film_id" uuid NOT NULL, "hall_id" uuid NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "price" integer NOT NULL, CONSTRAINT "PK_b9b94e86f112c69c3012959cd51" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "films" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "title" character varying(255) NOT NULL, "duration_minutes" integer NOT NULL, "release_year" integer NOT NULL, CONSTRAINT "PK_697487ada088902377482c970d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "showings" ADD CONSTRAINT "FK_f466787e0a7c6d00ca553573a7c" FOREIGN KEY ("film_id") REFERENCES "films"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showings" ADD CONSTRAINT "FK_c1e6cac97305ceb1b70b72e56c5" FOREIGN KEY ("hall_id") REFERENCES "halls"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "showings" DROP CONSTRAINT "FK_c1e6cac97305ceb1b70b72e56c5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showings" DROP CONSTRAINT "FK_f466787e0a7c6d00ca553573a7c"`,
    );
    await queryRunner.query(`DROP TABLE "films"`);
    await queryRunner.query(`DROP TABLE "showings"`);
    await queryRunner.query(`DROP TABLE "halls"`);
  }
}
