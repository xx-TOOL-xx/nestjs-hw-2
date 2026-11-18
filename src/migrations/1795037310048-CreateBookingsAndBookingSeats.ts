import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookingsAndBookingSeats1795037310048 implements MigrationInterface {
  name = 'CreateBookingsAndBookingSeats1795037310048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "showing_id" uuid NOT NULL, "total_price" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "booking_seats" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "booking_id" uuid NOT NULL, "showing_id" uuid NOT NULL, "row" integer NOT NULL, "seat" integer NOT NULL, CONSTRAINT "PK_a4d929dea33a0153ba9bc253db1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_booking_seats_showing_row_seat" ON "booking_seats"  ("showing_id", "row", "seat") `,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_8815ee8ca8bf44326ed49b459fa" FOREIGN KEY ("showing_id") REFERENCES "showings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_seats" ADD CONSTRAINT "FK_25c8b5c1e010af1cd2f699c5926" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_seats" ADD CONSTRAINT "FK_509c870b65f67f2123118f693ae" FOREIGN KEY ("showing_id") REFERENCES "showings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_seats" DROP CONSTRAINT "FK_509c870b65f67f2123118f693ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_seats" DROP CONSTRAINT "FK_25c8b5c1e010af1cd2f699c5926"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_8815ee8ca8bf44326ed49b459fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_booking_seats_showing_row_seat"`,
    );
    await queryRunner.query(`DROP TABLE "booking_seats"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
  }
}
