import 'dotenv/config';
import { DataSource } from 'typeorm';
import { BookingSeat } from './bookings/entities/booking-seat.entity';
import { Booking } from './bookings/entities/booking.entity';
import { validate } from './config/environment-variables';
import { Film } from './films/entities/film.entity';
import { Hall } from './halls/entities/hall.entity';
import { Showing } from './showings/entities/showing.entity';

/**
 * Connection for the TypeORM CLI (migrations) and for the seed script.
 *
 * These run outside NestJS, so there is no `ConfigService` here: the
 * variables are read from `.env` by dotenv and checked by the same class
 * the application uses. The application itself never imports this file.
 */
const env = validate(process.env);

export default new DataSource({
  type: 'postgres',
  uuidExtension: 'pgcrypto',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [Film, Hall, Showing, Booking, BookingSeat],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});
