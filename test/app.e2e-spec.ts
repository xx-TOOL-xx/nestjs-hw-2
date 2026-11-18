import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

const inDays = (days: number, hour = 18): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

describe('Cinema booking API (e2e)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;

  const unknownId = randomUUID();
  let filmId: string;
  let otherFilmId: string;
  let hallId: string;
  let showingId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());
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

    it('reads, updates and reports unknown films', async () => {
      await http.get(`/films/${filmId}`).expect(200);
      await http.get(`/films/${unknownId}`).expect(404);

      const { body } = await http
        .patch(`/films/${filmId}`)
        .send({ durationMinutes: 167 })
        .expect(200);
      expect(body).toMatchObject({
        title: 'Dune: Part Two',
        durationMinutes: 167,
      });

      await http.patch(`/films/${filmId}`).send({ title: 42 }).expect(400);
      await http.patch(`/films/${unknownId}`).send({ title: 'X' }).expect(404);
    });
  });

  describe('halls', () => {
    it('creates a hall and refuses a duplicate name with 409', async () => {
      const { body } = await http
        .post('/halls')
        .send({ name: 'Red hall', rows: 3, seatsPerRow: 5 })
        .expect(201);
      hallId = body.id;

      await http
        .post('/halls')
        .send({ name: 'Red hall', rows: 2, seatsPerRow: 2 })
        .expect(409);
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
      const { body } = await http
        .post('/showings')
        .send({ filmId, hallId, startsAt: inDays(2), price: 12500 })
        .expect(201);

      expect(body).toMatchObject({ filmId, hallId, price: 12500 });
      showingId = body.id;
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

      expect(body).toHaveLength(2);
      expect(body.map((item: { filmTitle: string }) => item.filmTitle)).toEqual(
        ['Arrival', 'Dune: Part Two'],
      );
      expect(body[0]).toEqual({
        id: expect.any(String),
        filmTitle: 'Arrival',
        hallName: 'Red hall',
        startsAt: inDays(1),
        price: 9000,
      });
    });

    it('filters by film and by day and combines both', async () => {
      const byFilm = await http.get(`/showings?filmId=${filmId}`).expect(200);
      expect(byFilm.body).toHaveLength(1);

      const day = inDays(1).slice(0, 10);
      const byDay = await http.get(`/showings?date=${day}`).expect(200);
      expect(byDay.body).toHaveLength(1);
      expect(byDay.body[0].filmTitle).toBe('Arrival');

      const both = await http
        .get(`/showings?filmId=${filmId}&date=${day}`)
        .expect(200);
      expect(both.body).toHaveLength(0);

      await http.get('/showings?date=01-05-2030').expect(400);
      await http.get('/showings?date=2030-02-30').expect(400);
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
      const { body } = await http.get(`/showings?date=${day}`).expect(200);

      expect(body.map((item: { id: string }) => item.id)).toEqual(
        [...created].sort(),
      );
    });

    it('reads one showing and reports unknown ones', async () => {
      const { body } = await http.get(`/showings/${showingId}`).expect(200);
      expect(body).toMatchObject({
        filmTitle: 'Dune: Part Two',
        hallName: 'Red hall',
      });
      expect(body).not.toHaveProperty('filmId');

      await http.get(`/showings/${unknownId}`).expect(404);
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

    it('answers 409 for a taken seat and books none of the list', async () => {
      await http
        .post(`/showings/${showingId}/bookings`)
        .send({
          seats: [
            { row: 3, seat: 5 },
            { row: 1, seat: 2 },
          ],
        })
        .expect(409);

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

    it('lists the bookings of a showing and reports unknown showings', async () => {
      const { body } = await http
        .get(`/showings/${showingId}/bookings`)
        .expect(200);
      expect(body).toHaveLength(1);

      await http.get(`/showings/${unknownId}/bookings`).expect(404);
      await http.get(`/showings/${unknownId}/seats`).expect(404);
      await http
        .post(`/showings/${unknownId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(404);
    });

    it('frees the seats when a booking is cancelled', async () => {
      await http.delete(`/bookings/${bookingId}`).expect(204);
      await http.delete(`/bookings/${bookingId}`).expect(404);

      const { body } = await http
        .get(`/showings/${showingId}/seats`)
        .expect(200);
      expect(body.some((seat: { isBooked: boolean }) => seat.isBooked)).toBe(
        false,
      );

      await http
        .post(`/showings/${showingId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);
    });
  });

  describe('deleting films and halls', () => {
    it('refuses to delete a film or a hall that a showing uses', async () => {
      await http.delete(`/films/${filmId}`).expect(409);
      await http.delete(`/halls/${hallId}`).expect(409);
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

  it('serves the Swagger document', async () => {
    const { body } = await http.get('/docs-json').expect(200);

    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining([
        '/films',
        '/halls/{id}',
        '/showings/{id}/seats',
        '/showings/{id}/bookings',
        '/bookings/{id}',
      ]),
    );
  });
});
