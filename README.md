# Cinema Booking API

Homework 2 for the "Back-end development with Node.js (NestJS)" course: a REST
service for a cinema that manages films, halls, showings and seat bookings.

It continues homework 1. The routes behave the same, but the data now lives in
PostgreSQL: the in-memory arrays are replaced by TypeORM entities and
repositories, and the schema is created by migrations. Two mechanisms are new:
the list of showings is paginated, filtered and sorted by the database, and a
booking with all of its seats is written in one transaction.

## Requirements

- Node.js 22.13 or newer
- npm
- Docker with Docker Compose

## Getting started

```bash
# 1. Install the dependencies
npm install

# 2. Create the .env file (see "Environment variables" below)
cp .env.example .env

# 3. Start PostgreSQL with Docker Compose and wait until it accepts connections
docker compose up -d --wait

# 4. Apply the migrations: they create the whole schema in the empty database
npm run migration:run

# 5. Fill the database with sample data (optional)
npm run seed

# 6. Run the application in development mode
npm run start:dev
```

The API listens on `http://localhost:3000` and the Swagger UI is available at
`http://localhost:3000/docs`.

## Environment variables

The variables are kept in the `.env` file. Example with sample values, the same
ones as in `.env.example`:

```dotenv
# HTTP server
PORT=3000

# PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_USER=cinema
DB_PASSWORD=cinema
DB_NAME=cinema
```

| Variable      | Required | Purpose                                                    |
| ------------- | -------- | ---------------------------------------------------------- |
| `PORT`        | no       | Port the HTTP server listens on, `3000` by default         |
| `DB_HOST`     | yes      | Host of the PostgreSQL server                              |
| `DB_PORT`     | yes      | Port of the PostgreSQL server, published by Docker Compose |
| `DB_USER`     | yes      | Database user, created by the container on first start     |
| `DB_PASSWORD` | yes      | Password of that user                                      |
| `DB_NAME`     | yes      | Database name, created by the container on first start     |

The application reads the file through `ConfigModule` and validates it on
startup with a class described by `class-validator` decorators
(`src/config/environment-variables.ts`). If a connection parameter is missing
or malformed, the application does not start and prints which variable is
wrong. Services get the values from `ConfigService`, never from `process.env`.

Docker Compose reads the same `.env` file, so one set of values configures both
the container and the application. If port 5432 is already taken on your
machine, change `DB_PORT` before starting the container.

## Database

### Docker Compose

```bash
docker compose up -d --wait   # start PostgreSQL 18 in the background
docker compose ps             # check that the container is healthy
docker compose down           # stop it, the data stays in a named volume
docker compose down -v        # stop it and delete the data
```

### Migrations

The schema is created only by the migrations in `src/migrations`;
`synchronize` is turned off. The TypeORM CLI uses its own data source file,
`src/data-source.ts`.

```bash
npm run migration:run       # apply every migration that is not applied yet
npm run migration:revert    # undo the last applied migration
npm run migration:show      # list the migrations and their state
npm run migration:generate -- src/migrations/Name   # after changing an entity
```

Every migration has a `down` method that undoes its `up`, so reverting all of
them returns the database to its empty state. An applied migration is never
edited: a change of the schema is a new migration.

| Table           | Columns                                                        | Notes                                                                              |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `films`         | `id`, `title`, `duration_minutes`, `release_year`              |                                                                                    |
| `halls`         | `id`, `name`, `rows`, `seats_per_row`                          | `name` is unique                                                                   |
| `showings`      | `id`, `film_id`, `hall_id`, `starts_at` (timestamptz), `price` | foreign keys to `films` and `halls`                                                |
| `bookings`      | `id`, `showing_id`, `total_price`, `created_at`                | foreign key to `showings`                                                          |
| `booking_seats` | `id`, `booking_id`, `showing_id`, `row`, `seat`                | unique index on (`showing_id`, `row`, `seat`); `booking_id` is `ON DELETE CASCADE` |

Every `id` is a `uuid` with the default `gen_random_uuid()`
(`uuidExtension: 'pgcrypto'`).

### Seed

```bash
npm run seed
```

`src/seed.ts` adds two films, two halls, four showings on four different days
(starting tomorrow) and one booking of two seats. Run it after the migrations.
The rows have fixed ids and are inserted with `ON CONFLICT DO NOTHING`, so a
second run creates no duplicates.

## Trying the API

`requests.http` in the repository root holds a request for every route and for
every error described in the task. Open it in VS Code with the
[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension and send the requests from top to bottom. Identifiers come from the
responses of earlier requests and dates are generated relative to the current
time, so nothing has to be typed in by hand. The file works on an empty
database and can be run again on a database that already has data.

## Routes

| Method   | Path                     | Success | Errors        |
| -------- | ------------------------ | ------- | ------------- |
| `POST`   | `/films`                 | 201     | 400           |
| `GET`    | `/films`                 | 200     |               |
| `GET`    | `/films/:id`             | 200     | 404           |
| `PATCH`  | `/films/:id`             | 200     | 400, 404      |
| `DELETE` | `/films/:id`             | 204     | 404, 409      |
| `POST`   | `/halls`                 | 201     | 400, 409      |
| `GET`    | `/halls`                 | 200     |               |
| `GET`    | `/halls/:id`             | 200     | 404           |
| `DELETE` | `/halls/:id`             | 204     | 404, 409      |
| `POST`   | `/showings`              | 201     | 400           |
| `GET`    | `/showings`              | 200     | 400           |
| `GET`    | `/showings/:id`          | 200     | 404           |
| `GET`    | `/showings/:id/seats`    | 200     | 404           |
| `POST`   | `/showings/:id/bookings` | 201     | 400, 404, 409 |
| `GET`    | `/showings/:id/bookings` | 200     | 404           |
| `GET`    | `/bookings`              | 200     |               |
| `DELETE` | `/bookings/:id`          | 204     | 404           |

Every `:id` is a UUID. A value that is not a UUID is answered with 400, because
no record can have such an identifier.

### `GET /showings`

All query parameters are optional.

| Parameter | Values                | Default | Meaning                                        |
| --------- | --------------------- | ------- | ---------------------------------------------- |
| `filmId`  | UUID                  |         | Only the showings of this film                 |
| `date`    | `YYYY-MM-DD`          |         | Only the showings that start on this day (UTC) |
| `page`    | integer, 1 or more    | `1`     | Page number                                    |
| `limit`   | integer from 1 to 100 | `20`    | Number of showings on a page                   |
| `sort`    | `asc` or `desc`       | `asc`   | Order by start time                            |

```json
{
  "items": [
    {
      "id": "a3000000-0000-4000-8000-000000000001",
      "filmTitle": "Dune: Part Two",
      "hallName": "Grand hall",
      "startsAt": "2030-05-01T18:00:00.000Z",
      "price": 15000
    }
  ],
  "total": 4,
  "page": 1,
  "limit": 20
}
```

`total` is the number of showings that match the filters on all pages. The
query is built with the TypeORM Query Builder: the filters become `WHERE`, the
order becomes `ORDER BY` and the page becomes `LIMIT` / `OFFSET`, so the
application never loads the whole table to cut a page out of it.

### Errors

A global exception filter (`src/common/filters/global-exception.filter.ts`)
gives every error response the same structure:

```json
{
  "statusCode": 409,
  "message": "Already booked on this showing: row 1 seat 2",
  "error": "Conflict",
  "path": "/showings/a3000000-0000-4000-8000-000000000001/bookings",
  "timestamp": "2030-05-01T18:00:00.000Z"
}
```

`message` is a string, or a list of strings when the request fails validation
(one entry per broken rule). An unexpected failure is logged and answered with
a generic 500 in the same structure, so database error texts never reach the
client.

## Project structure

```
docker-compose.yml          PostgreSQL for local development
requests.http               a request for every route and every error
src/
├── main.ts                 entry point, starts the server
├── app.setup.ts            global ValidationPipe, exception filter and Swagger
├── app.module.ts           ConfigModule, TypeORM connection, domain modules
├── data-source.ts          connection for the TypeORM CLI and the seed script
├── seed.ts                 sample data, `npm run seed`
├── config/                 validated environment variables
├── common/                 exception filter, error DTO, PostgreSQL helpers
├── migrations/             everything needed to build the schema from scratch
├── films/                  films: controller, service, DTOs, entity
├── halls/                  halls and the seat list computed from their size
├── showings/               showings, paginated and filtered schedule
└── bookings/               bookings, their seats and the seat map of a showing
test/                       e2e tests: API, migrations, seed
```

Every module keeps its TypeORM entities in its own `entities` folder and gets
its repositories through `TypeOrmModule.forFeature()`.

### Module dependencies

Modules talk to each other only through exported services, and the
dependencies point one way, as in homework 1:

```
bookings ──> showings ──> films
    │            └──────> halls
    └───────────────────> halls
```

Films and halls know nothing about showings, yet a film or a hall must not be
deleted while a showing refers to it. In homework 1 `ShowingsService`
registered a "usage check" callback with them. Now the database itself knows
the answer: the foreign keys `showings.film_id` and `showings.hall_id` are
`ON DELETE NO ACTION`, so PostgreSQL rejects such a delete with a foreign key
violation, and `FilmsService` / `HallsService` turn that rejection into 409
with the reason. No callback, no circular import and no extra query are
needed, and nothing ever cascades from a film to its showings.

### Entities and relations

| Relation                  | Declared as                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| film has many showings    | `Showing.film` (`@ManyToOne`, required) / `Film.showings`                               |
| hall has many showings    | `Showing.hall` (`@ManyToOne`, required) / `Hall.showings`                               |
| showing has many bookings | `Booking.showing` (`@ManyToOne`, required) / `Showing.bookings`                         |
| booking has many seats    | `BookingSeat.booking` (`@ManyToOne`, required, `onDelete: 'CASCADE'`) / `Booking.seats` |
| seat belongs to a showing | `BookingSeat.showing` (`@ManyToOne`, required)                                          |

Required relations are marked `nullable: false`. Both sides of a relation are
declared, so the entity classes of related tables refer to each other; that is
not a module dependency, and no module imports a module that depends on it.
The unique index on
(`showing_id`, `row`, `seat`) is declared on the `BookingSeat` class with
`@Index(..., { unique: true })`.

### Booking in one transaction

`BookingsService.create()` opens a transaction with `DataSource.transaction()`,
inserts the booking, then inserts all of its seats. Whether a seat is free is
decided by the unique index, not by a query in the application, so two
simultaneous requests cannot both get the same seat. If the index rejects a
seat, PostgreSQL reports the unique violation (`23505`), TypeORM rolls the
transaction back, and the service answers 409 with its own message: neither
the booking nor any of its seats stays in the database. Any other database
failure remains a server error.

Cancelling a booking deletes one row from `bookings`; its seats are removed by
the database through `ON DELETE CASCADE`.

### Where the checks live

- **DTOs** (`class-validator`) check the shape of the input: required fields,
  types, ranges, date formats and the uniqueness of seats inside one request.
- **Services** check the rules that need the stored data: that a film and a
  hall exist, and that a seat fits into the hall.
- **The database** enforces what must hold even for simultaneous requests:
  unique hall names, one booking per seat of a showing, and no deleted film or
  hall under an existing showing.

`ValidationPipe` is registered globally with `whitelist: true`, so fields that
are not declared in a DTO never reach a service.

## Rules worth knowing

- Prices are integers in the smallest currency unit: a ticket for 125.00 is
  stored as `12500`. The total price of a booking is the showing price
  multiplied by the number of seats.
- `startsAt` accepts any ISO 8601 date that is not in the past, is stored as
  `timestamptz` and is always returned in UTC.
- The `date` filter of `GET /showings` (`YYYY-MM-DD`) selects the showings that
  start on that day in UTC.
- Showings are ordered by start time, ascending or descending; showings that
  start at the same moment are ordered by `id`.
- A booking is all or nothing: if one of the requested seats is already taken,
  the answer is 409 and none of the seats is booked.
- The seats of a booking are returned ordered by row and seat.
- Numbers must fit a PostgreSQL `integer` and titles and names are limited to
  255 characters; larger values are answered with 400.

## Tests and code quality

```bash
npm test            # unit tests, no database needed
npm run test:e2e    # end-to-end tests against PostgreSQL
npm run lint        # ESLint
npm run format      # Prettier
```

The e2e tests need the database container to be running. They do not touch
the development data: they create their own database named `<DB_NAME>_test`
on the same server and rebuild its schema from the migrations on every run.
They cover every route and error case, pagination and sorting, the booking
transaction (a 409 leaves no rows behind), the cascade delete of seats, the
error structure, the migrations (up, down and up again) and the seed script.
