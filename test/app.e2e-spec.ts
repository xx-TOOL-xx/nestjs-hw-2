import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { migrateTestDatabase } from './test-database';

const inDays = (days: number, hour = 18): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

type Item = { id: string; filmTitle: string; startsAt: string };
const ids = (items: Item[]): string[] => items.map((item) => item.id);

describe('Cinema booking API (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let dataSource: DataSource;

  const unknownId = randomUUID();
  let filmId: string;
  let otherFilmId: string;
  let hallId: string;
  let showingId: string;
  let bookingId: string;

  /** Counts rows straight in the database, past the API. */
  const countRows = async (
    table: 'bookings' | 'booking_seats' | 'showings',
    column?: string,
    value?: string,
  ): Promise<number> => {
    const where = column ? ` WHERE "${column}" = $1` : '';
    const [{ count }]: { count: number }[] = await dataSource.query(
      `SELECT count(*)::int AS count FROM "${table}"${where}`,
      column ? [value] : [],
    );
    return count;
  };

  beforeAll(async () => {
    // Real PostgreSQL, empty schema created by the migrations.
    await migrateTestDatabase();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('films', () => {
    it('returns an empty list before anything is created', async () => {
      await http.get('/films').expect(200, []);
    });

    it('creates a film and drops fields that are not in the DTO', async () => {
      const { body } = await http
        .post('/films')
        .send({
          title: 'Dune: Part Two',
          durationMinutes: 166,
          releaseYear: 2024,
          rating: 10,
        })
        .expect(201);

      expect(body).toEqual({
        id: expect.any(String),
        title: 'Dune: Part Two',
        durationMinutes: 166,
        releaseYear: 2024,
      });
      filmId = body.id;

      const other = await http
        .post('/films')
        .send({ title: 'Arrival', durationMinutes: 116, releaseYear: 2016 })
        .expect(201);
      otherFilmId = other.body.id;
    });

    it('rejects a missing field and a wrong type with 400', async () => {
      await http
        .post('/films')
        .send({ title: 'No duration', releaseYear: 2020 })
        .expect(400);
      await http
        .post('/films')
        .send({ title: 'Bad', durationMinutes: '166', releaseYear: 2024 })
        .expect(400);
    });

    it('answers 400 for values the columns cannot hold', async () => {
      await http
        .post('/films')
        .send({ title: 'Long', durationMinutes: 2 ** 31, releaseYear: 2024 })
        .expect(400);
      await http
        .post('/films')
        .send({
          title: 'x'.repeat(256),
          durationMinutes: 90,
          releaseYear: 2024,
        })
        .expect(400);
    });

    it('reads, updates and reports unknown films', async () => {
      await http.get(`/films/${filmId}`).expect(200);
      await http.get(`/films/${unknownId}`).expect(404);

      const { body } = await http
        .patch(`/films/${filmId}`)
        .send({ durationMinutes: 167 })
        .expect(200);
      expect(body).toEqual({
        id: filmId,
        title: 'Dune: Part Two',
        durationMinutes: 167,
        releaseYear: 2024,
      });

      const stored = await http.get(`/films/${filmId}`).expect(200);
      expect(stored.body.durationMinutes).toBe(167);

      await http.patch(`/films/${filmId}`).send({ title: 42 }).expect(400);
      await http.patch(`/films/${filmId}`).send({ title: null }).expect(400);
      await http.patch(`/films/${unknownId}`).send({ title: 'X' }).expect(404);
    });
  });

  describe('halls', () => {
    it('creates a hall and refuses a duplicate name with 409', async () => {
      const { body } = await http
        .post('/halls')
        .send({ name: 'Red hall', rows: 3, seatsPerRow: 5 })
        .expect(201);
      expect(body).toEqual({
        id: expect.any(String),
        name: 'Red hall',
        rows: 3,
        seatsPerRow: 5,
      });
      hallId = body.id;

      const duplicate = await http
        .post('/halls')
        .send({ name: 'Red hall', rows: 2, seatsPerRow: 2 })
        .expect(409);
      expect(duplicate.body.message).toBe(
        'Hall named "Red hall" already exists',
      );

      const { body: halls } = await http.get('/halls').expect(200);
      expect(halls).toHaveLength(1);
    });

    it('rejects numbers that are not positive integers with 400', async () => {
      await http
        .post('/halls')
        .send({ name: 'Zero', rows: 0, seatsPerRow: 5 })
        .expect(400);
      await http
        .post('/halls')
        .send({ name: 'Float', rows: 2.5, seatsPerRow: 5 })
        .expect(400);
      await http.post('/halls').send({ name: 'Missing', rows: 2 }).expect(400);
    });

    it('lists the seats computed from rows and seatsPerRow', async () => {
      const { body } = await http.get(`/halls/${hallId}`).expect(200);

      expect(body.seats).toHaveLength(15);
      expect(body.seats[0]).toEqual({ row: 1, seat: 1 });
      expect(body.seats[14]).toEqual({ row: 3, seat: 5 });

      await http.get(`/halls/${unknownId}`).expect(404);
    });
  });

  describe('showings', () => {
    it('creates a showing', async () => {
      const startsAt = inDays(2);
      const { body } = await http
        .post('/showings')
        .send({ filmId, hallId, startsAt, price: 12500 })
        .expect(201);

      expect(body).toEqual({
        id: expect.any(String),
        filmId,
        hallId,
        startsAt,
        price: 12500,
      });
      showingId = body.id;
    });

    it('stores the start time in UTC whatever offset it was sent with', async () => {
      const { body } = await http
        .post('/showings')
        .send({
          filmId: otherFilmId,
          hallId,
          startsAt: '2031-03-10T20:30:00+02:00',
          price: 7000,
        })
        .expect(201);

      expect(body.startsAt).toBe('2031-03-10T18:30:00.000Z');

      const { body: view } = await http.get(`/showings/${body.id}`).expect(200);
      expect(view.startsAt).toBe('2031-03-10T18:30:00.000Z');
    });

    it('names the missing record or the invalid field in a 400', async () => {
      const film = await http
        .post('/showings')
        .send({ filmId: unknownId, hallId, startsAt: inDays(2), price: 100 })
        .expect(400);
      expect(film.body.message).toContain('Film');

      const hall = await http
        .post('/showings')
        .send({ filmId, hallId: unknownId, startsAt: inDays(2), price: 100 })
        .expect(400);
      expect(hall.body.message).toContain('Hall');

      const format = await http
        .post('/showings')
        .send({ filmId, hallId, startsAt: 'tomorrow evening', price: 100 })
        .expect(400);
      expect(JSON.stringify(format.body.message)).toContain('startsAt');

      const past = await http
        .post('/showings')
        .send({ filmId, hallId, startsAt: '2020-01-01T10:00:00Z', price: 100 })
        .expect(400);
      expect(JSON.stringify(past.body.message)).toContain('past');

      const price = await http
        .post('/showings')
        .send({ filmId, hallId, startsAt: inDays(2), price: 99.5 })
        .expect(400);
      expect(JSON.stringify(price.body.message)).toContain('price');
    });

    it('lists showings by start time with names instead of ids', async () => {
      await http
        .post('/showings')
        .send({
          filmId: otherFilmId,
          hallId,
          startsAt: inDays(1),
          price: 9000,
        })
        .expect(201);

      const { body } = await http.get('/showings').expect(200);

      expect(body).toEqual({
        items: expect.any(Array),
        total: 3,
        page: 1,
        limit: 20,
      });
      expect(body.items.map((item: Item) => item.filmTitle)).toEqual([
        'Arrival',
        'Dune: Part Two',
        'Arrival',
      ]);
      expect(body.items[0]).toEqual({
        id: expect.any(String),
        filmTitle: 'Arrival',
        hallName: 'Red hall',
        startsAt: inDays(1),
        price: 9000,
      });
    });

    it('filters by film and by day and combines both', async () => {
      const byFilm = await http.get(`/showings?filmId=${filmId}`).expect(200);
      expect(byFilm.body.items).toHaveLength(1);
      expect(byFilm.body.total).toBe(1);

      const day = inDays(1).slice(0, 10);
      const byDay = await http.get(`/showings?date=${day}`).expect(200);
      expect(byDay.body.items).toHaveLength(1);
      expect(byDay.body.items[0].filmTitle).toBe('Arrival');

      const both = await http
        .get(`/showings?filmId=${filmId}&date=${day}`)
        .expect(200);
      expect(both.body).toEqual({ items: [], total: 0, page: 1, limit: 20 });

      await http.get('/showings?date=01-05-2030').expect(400);
      await http.get('/showings?date=2030-02-30').expect(400);
      await http.get('/showings?filmId=not-a-uuid').expect(400);
    });

    it('treats the date filter as a UTC day, both ends included', async () => {
      const post = (startsAt: string) =>
        http
          .post('/showings')
          .send({ filmId: otherFilmId, hallId, startsAt, price: 5000 })
          .expect(201);
      const first = await post('2032-06-15T00:00:00.000Z');
      const last = await post('2032-06-15T23:59:59.999Z');
      await post('2032-06-14T23:59:59.999Z');
      await post('2032-06-16T00:00:00.000Z');

      const { body } = await http.get('/showings?date=2032-06-15').expect(200);

      expect(ids(body.items)).toEqual([first.body.id, last.body.id]);
      expect(body.total).toBe(2);
    });

    it('orders showings that start together by id', async () => {
      const startsAt = inDays(5);
      const created: string[] = [];
      for (let i = 0; i < 3; i += 1) {
        const { body } = await http
          .post('/showings')
          .send({ filmId: otherFilmId, hallId, startsAt, price: 5000 })
          .expect(201);
        created.push(body.id);
      }

      const day = startsAt.slice(0, 10);
      const asc = await http.get(`/showings?date=${day}`).expect(200);
      expect(ids(asc.body.items)).toEqual([...created].sort());

      // `sort` reverses the start time only; ties are still ordered by id.
      const desc = await http
        .get(`/showings?date=${day}&sort=desc`)
        .expect(200);
      expect(ids(desc.body.items)).toEqual([...created].sort());
    });

    it('reads one showing and reports unknown ones', async () => {
      const { body } = await http.get(`/showings/${showingId}`).expect(200);
      expect(body).toEqual({
        id: showingId,
        filmTitle: 'Dune: Part Two',
        hallName: 'Red hall',
        startsAt: inDays(2),
        price: 12500,
      });

      await http.get(`/showings/${unknownId}`).expect(404);
    });
  });

  describe('showings pagination and sorting', () => {
    let pagedFilmId: string;
    /** Five showings of one film, in chronological order. */
    const chronological: string[] = [];

    beforeAll(async () => {
      const film = await http
        .post('/films')
        .send({ title: 'Paged', durationMinutes: 100, releaseYear: 2020 })
        .expect(201);
      pagedFilmId = film.body.id;

      // Created out of order, so that insertion order cannot pass for sorting.
      const created = new Map<number, string>();
      for (const day of [13, 11, 15, 12, 14]) {
        const { body } = await http
          .post('/showings')
          .send({
            filmId: pagedFilmId,
            hallId,
            startsAt: inDays(day),
            price: 6000,
          })
          .expect(201);
        created.set(day, body.id);
      }
      for (const day of [11, 12, 13, 14, 15]) {
        chronological.push(created.get(day)!);
      }
    });

    const list = (query: string) =>
      http.get(`/showings?filmId=${pagedFilmId}${query}`);

    it('uses page 1, limit 20 and ascending order by default', async () => {
      const { body } = await list('').expect(200);

      expect(ids(body.items)).toEqual(chronological);
      expect(body).toMatchObject({ total: 5, page: 1, limit: 20 });
    });

    it('cuts the list into pages and keeps the total of the filter', async () => {
      const first = await list('&limit=2').expect(200);
      expect(ids(first.body.items)).toEqual(chronological.slice(0, 2));
      expect(first.body).toMatchObject({ total: 5, page: 1, limit: 2 });

      const second = await list('&limit=2&page=2').expect(200);
      expect(ids(second.body.items)).toEqual(chronological.slice(2, 4));
      expect(second.body).toMatchObject({ total: 5, page: 2, limit: 2 });

      const third = await list('&limit=2&page=3').expect(200);
      expect(ids(third.body.items)).toEqual(chronological.slice(4));

      const beyond = await list('&limit=2&page=4').expect(200);
      expect(beyond.body).toEqual({ items: [], total: 5, page: 4, limit: 2 });
    });

    it('sorts by start time in the requested direction', async () => {
      const descending = [...chronological].reverse();

      const asc = await list('&sort=asc').expect(200);
      expect(ids(asc.body.items)).toEqual(chronological);

      const desc = await list('&sort=desc').expect(200);
      expect(ids(desc.body.items)).toEqual(descending);

      const page = await list('&sort=desc&limit=2&page=2').expect(200);
      expect(ids(page.body.items)).toEqual(descending.slice(2, 4));
    });

    it('applies the limits to the whole list as well', async () => {
      const all = await http.get('/showings?limit=100').expect(200);
      const page = await http.get('/showings?limit=3&page=2').expect(200);

      expect(all.body.total).toBe(await countRows('showings'));
      expect(all.body.items).toHaveLength(all.body.total);
      expect(page.body.total).toBe(all.body.total);
      expect(ids(page.body.items)).toEqual(ids(all.body.items).slice(3, 6));
    });

    it('accepts a page far beyond the data', async () => {
      const { body } = await list('&page=999999999999999999999').expect(200);

      expect(body.items).toEqual([]);
      expect(body.total).toBe(5);
    });

    it.each([
      ['page=0', 'page'],
      ['page=-1', 'page'],
      ['page=1.5', 'page'],
      ['page=abc', 'page'],
      ['page=', 'page'],
      ['limit=0', 'limit'],
      ['limit=101', 'limit'],
      ['limit=2.5', 'limit'],
      ['limit=ten', 'limit'],
      ['sort=up', 'sort'],
      ['sort=ASC', 'sort'],
    ])('answers 400 for ?%s', async (query, field) => {
      const { body } = await http.get(`/showings?${query}`).expect(400);

      expect(JSON.stringify(body.message)).toContain(field);
    });
  });

  describe('bookings', () => {
    it('shows every seat as free before the first booking', async () => {
      const { body } = await http
        .get(`/showings/${showingId}/seats`)
        .expect(200);

      expect(body).toHaveLength(15);
      expect(body.every((seat: { isBooked: boolean }) => !seat.isBooked)).toBe(
        true,
      );
      await http.get('/bookings').expect(200, []);
    });

    it('books seats and computes the total price', async () => {
      const { body } = await http
        .post(`/showings/${showingId}/bookings`)
        .send({
          seats: [
            { row: 1, seat: 1 },
            { row: 1, seat: 2 },
          ],
        })
        .expect(201);

      expect(body).toEqual({
        id: expect.any(String),
        showingId,
        seats: [
          { row: 1, seat: 1 },
          { row: 1, seat: 2 },
        ],
        totalPrice: 25000,
      });
      bookingId = body.id;

      expect(await countRows('bookings', 'id', bookingId)).toBe(1);
      expect(await countRows('booking_seats', 'booking_id', bookingId)).toBe(2);
    });

    it('rejects malformed seat lists with 400', async () => {
      const post = (seats: unknown) =>
        http.post(`/showings/${showingId}/bookings`).send({ seats });

      await post([]).expect(400);
      await post([{ row: 2 }]).expect(400);
      await post([
        { row: 2, seat: 1 },
        { row: 2, seat: 1 },
      ]).expect(400);
      await post([{ row: 4, seat: 1 }]).expect(400);
      await post([{ row: 1, seat: 6 }]).expect(400);
      await post([{ row: 0, seat: 1 }]).expect(400);
      await post([{ row: 1.5, seat: 1 }]).expect(400);
      await http.post(`/showings/${showingId}/bookings`).send({}).expect(400);
    });

    it('answers 409 for a taken seat and rolls the whole booking back', async () => {
      const bookingsBefore = await countRows('bookings');
      const seatsBefore = await countRows('booking_seats');

      // The free seat comes first: it is written, then the taken one fails.
      const { body } = await http
        .post(`/showings/${showingId}/bookings`)
        .send({
          seats: [
            { row: 1, seat: 2 },
            { row: 1, seat: 3 },
            { row: 3, seat: 5 },
          ],
        })
        .expect(409);

      // Neither the booking nor any of its seats is left in the database.
      expect(await countRows('bookings')).toBe(bookingsBefore);
      expect(await countRows('booking_seats')).toBe(seatsBefore);

      // The message is ours and names the seat; no database text leaks out.
      expect(body).toMatchObject({
        statusCode: 409,
        message: 'Already booked on this showing: row 1 seat 2',
        path: `/showings/${showingId}/bookings`,
      });
      expect(JSON.stringify(body)).not.toMatch(
        /duplicate|constraint|UQ_|booking_seats|violates/i,
      );

      const seats = await http.get(`/showings/${showingId}/seats`).expect(200);
      const booked = seats.body.filter(
        (seat: { isBooked: boolean }) => seat.isBooked,
      );
      expect(booked).toEqual([
        { row: 1, seat: 1, isBooked: true },
        { row: 1, seat: 2, isBooked: true },
      ]);

      const all = await http.get('/bookings').expect(200);
      expect(all.body).toHaveLength(1);
    });

    it('lets exactly one of several simultaneous bookings win a seat', async () => {
      const bookingsBefore = await countRows('bookings');
      const attempt = (seats: { row: number; seat: number }[]) =>
        http.post(`/showings/${showingId}/bookings`).send({ seats });

      // Overlapping seat sets, listed in different orders.
      const responses = await Promise.all([
        attempt([
          { row: 2, seat: 1 },
          { row: 2, seat: 2 },
        ]),
        attempt([
          { row: 2, seat: 2 },
          { row: 2, seat: 1 },
        ]),
        attempt([
          { row: 2, seat: 2 },
          { row: 2, seat: 3 },
        ]),
        attempt([{ row: 2, seat: 2 }]),
        attempt([
          { row: 2, seat: 3 },
          { row: 2, seat: 2 },
          { row: 2, seat: 1 },
        ]),
      ]);

      const statuses = responses.map((response) => response.status).sort();
      expect(statuses).toEqual([201, 409, 409, 409, 409]);

      const winner = responses.find((response) => response.status === 201)!;
      expect(await countRows('bookings')).toBe(bookingsBefore + 1);
      expect(
        await countRows('booking_seats', 'booking_id', winner.body.id),
      ).toBe(winner.body.seats.length);

      await http.delete(`/bookings/${winner.body.id}`).expect(204);
    });

    it('returns the seats of a booking ordered by row and seat', async () => {
      const { body } = await http
        .post(`/showings/${showingId}/bookings`)
        .send({
          seats: [
            { row: 3, seat: 2 },
            { row: 2, seat: 5 },
            { row: 3, seat: 1 },
          ],
        })
        .expect(201);
      const ordered = [
        { row: 2, seat: 5 },
        { row: 3, seat: 1 },
        { row: 3, seat: 2 },
      ];
      expect(body.seats).toEqual(ordered);
      expect(body.totalPrice).toBe(37500);

      const { body: bookings } = await http
        .get(`/showings/${showingId}/bookings`)
        .expect(200);
      // Oldest booking first.
      expect(bookings.map((booking: { id: string }) => booking.id)).toEqual([
        bookingId,
        body.id,
      ]);
      expect(bookings[1].seats).toEqual(ordered);

      await http.delete(`/bookings/${body.id}`).expect(204);
    });

    it('lists the bookings of a showing and reports unknown showings', async () => {
      const { body } = await http
        .get(`/showings/${showingId}/bookings`)
        .expect(200);
      expect(body).toEqual([
        {
          id: bookingId,
          showingId,
          seats: [
            { row: 1, seat: 1 },
            { row: 1, seat: 2 },
          ],
          totalPrice: 25000,
        },
      ]);

      await http.get(`/showings/${unknownId}/bookings`).expect(404);
      await http.get(`/showings/${unknownId}/seats`).expect(404);
      await http
        .post(`/showings/${unknownId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(404);
    });

    it('deletes the seats in the database when a booking is cancelled', async () => {
      expect(await countRows('booking_seats', 'booking_id', bookingId)).toBe(2);

      await http.delete(`/bookings/${bookingId}`).expect(204);

      // ON DELETE CASCADE: the seat rows went together with the booking row.
      expect(await countRows('bookings', 'id', bookingId)).toBe(0);
      expect(await countRows('booking_seats', 'booking_id', bookingId)).toBe(0);
      await http.delete(`/bookings/${bookingId}`).expect(404);

      const { body } = await http
        .get(`/showings/${showingId}/seats`)
        .expect(200);
      expect(body.some((seat: { isBooked: boolean }) => seat.isBooked)).toBe(
        false,
      );

      // The freed seat can be booked again.
      await http
        .post(`/showings/${showingId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);
    });
  });

  describe('deleting films and halls', () => {
    it('refuses to delete a film or a hall that a showing uses', async () => {
      const showingsBefore = await countRows('showings');

      const film = await http.delete(`/films/${filmId}`).expect(409);
      expect(film.body.message).toBe(
        `Film with id ${filmId} is referenced by at least one showing`,
      );

      const hall = await http.delete(`/halls/${hallId}`).expect(409);
      expect(hall.body.message).toBe(
        `Hall with id ${hallId} is referenced by at least one showing`,
      );

      // Nothing was deleted and nothing cascaded to the showings.
      await http.get(`/films/${filmId}`).expect(200);
      await http.get(`/halls/${hallId}`).expect(200);
      expect(await countRows('showings')).toBe(showingsBefore);
    });

    it('deletes unused records and answers 404 afterwards', async () => {
      const film = await http
        .post('/films')
        .send({ title: 'Unused', durationMinutes: 90, releaseYear: 2001 })
        .expect(201);
      await http.delete(`/films/${film.body.id}`).expect(204);
      await http.get(`/films/${film.body.id}`).expect(404);
      await http.delete(`/films/${film.body.id}`).expect(404);

      const hall = await http
        .post('/halls')
        .send({ name: 'Spare hall', rows: 1, seatsPerRow: 1 })
        .expect(201);
      await http.delete(`/halls/${hall.body.id}`).expect(204);
      await http.delete(`/halls/${hall.body.id}`).expect(404);
    });

    it('answers 400 for an id that is not a UUID', async () => {
      await http.get('/films/42').expect(400);
    });
  });

  describe('error responses', () => {
    const errorShape = (statusCode: number, error: string, path: string) => ({
      statusCode,
      message: expect.anything(),
      error,
      path,
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/),
    });

    it('have one structure with the status code, the message and the path', async () => {
      const notFound = await http.get(`/films/${unknownId}`).expect(404);
      expect(notFound.body).toEqual(
        errorShape(404, 'Not Found', `/films/${unknownId}`),
      );
      expect(notFound.body.message).toBe(`Film with id ${unknownId} not found`);

      const invalid = await http.post('/films').send({}).expect(400);
      expect(invalid.body).toEqual(errorShape(400, 'Bad Request', '/films'));
      expect(invalid.body.message).toEqual(expect.any(Array));

      const conflict = await http.delete(`/films/${filmId}`).expect(409);
      expect(conflict.body).toEqual(
        errorShape(409, 'Conflict', `/films/${filmId}`),
      );

      const query = await http.get('/showings?page=0').expect(400);
      expect(query.body).toEqual(
        errorShape(400, 'Bad Request', '/showings?page=0'),
      );
    });

    it('cover unknown routes and malformed JSON as well', async () => {
      const route = await http.get('/no-such-route').expect(404);
      expect(route.body).toEqual(
        errorShape(404, 'Not Found', '/no-such-route'),
      );

      const json = await http
        .post('/films')
        .set('Content-Type', 'application/json')
        .send('{"title": ')
        .expect(400);
      expect(json.body).toEqual(errorShape(400, 'Bad Request', '/films'));
    });
  });

  describe('Swagger document', () => {
    let document: {
      paths: Record<string, Record<string, any>>;
      components: { schemas: Record<string, any> };
    };

    beforeAll(async () => {
      const { body } = await http.get('/docs-json').expect(200);
      document = body;
    });

    it('lists the routes', () => {
      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining([
          '/films',
          '/halls/{id}',
          '/showings',
          '/showings/{id}/seats',
          '/showings/{id}/bookings',
          '/bookings/{id}',
        ]),
      );
    });

    it('describes the paginated response of GET /showings', () => {
      const ok = document.paths['/showings'].get.responses['200'];
      expect(ok.content['application/json'].schema.$ref).toBe(
        '#/components/schemas/PaginatedShowings',
      );

      const schema = document.components.schemas.PaginatedShowings;
      expect(Object.keys(schema.properties)).toEqual([
        'items',
        'total',
        'page',
        'limit',
      ]);
      expect(schema.properties.items).toEqual(
        expect.objectContaining({
          type: 'array',
          items: { $ref: '#/components/schemas/ShowingView' },
        }),
      );
    });

    it('describes the query parameters of GET /showings', () => {
      const parameters: { name: string; required: boolean; schema: any }[] =
        document.paths['/showings'].get.parameters;
      const byName = Object.fromEntries(
        parameters.map((parameter) => [parameter.name, parameter]),
      );

      expect(Object.keys(byName).sort()).toEqual([
        'date',
        'filmId',
        'limit',
        'page',
        'sort',
      ]);
      expect(parameters.every((parameter) => !parameter.required)).toBe(true);
      expect(byName.page.schema).toMatchObject({ minimum: 1, default: 1 });
      expect(byName.limit.schema).toMatchObject({
        minimum: 1,
        maximum: 100,
        default: 20,
      });
      expect(byName.sort.schema).toMatchObject({
        enum: ['asc', 'desc'],
        default: 'asc',
      });
    });
  });
});
