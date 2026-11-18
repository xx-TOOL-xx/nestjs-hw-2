# Cinema Booking API

Homework 1 for the "Back-end development with Node.js (NestJS)" course: a REST
service for a cinema that manages films, halls, showings and seat bookings.

Data lives in memory, inside the services, so it is reset on every restart.
The point of this step is the module structure; a database comes in the next
homework.

## Requirements

- Node.js 22 or newer
- npm

## Install

```bash
npm install
```

## Run in development mode

```bash
npm run start:dev
```

The API listens on `http://localhost:3000` and the Swagger UI is available at
`http://localhost:3000/docs`.

## Environment variables

Copy `.env.example` to `.env` and adjust the values if needed. The file is
optional: without it the defaults below are used.

```dotenv
PORT=3000
```

| Variable | Default | Purpose                         |
| -------- | ------- | ------------------------------- |
| `PORT`   | `3000`  | Port the HTTP server listens on |

## Trying the API

`requests.http` in the repository root holds a request for every route and for
every error described in the task. Open it in VS Code with the
[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension and send the requests from top to bottom. Identifiers come from the
responses of earlier requests and dates are generated relative to the current
time, so nothing has to be typed in by hand.

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

## Project structure

```
src/
├── main.ts                 entry point, loads .env and starts the server
├── app.setup.ts            global ValidationPipe and Swagger, shared with tests
├── app.module.ts           assembles the domain modules
├── common/                 small helpers shared by the domains
├── films/                  films: controller, service, DTOs, entity
├── halls/                  halls and the seat list computed from their size
├── showings/               showings, schedule filtering and sorting
└── bookings/               seat bookings and the seat map of a showing
```

Each domain module has its own controller and service and keeps its records in
a private array inside the service. Modules talk to each other only through
exported services.

### Module dependencies

Dependencies point one way:

```
bookings ──> showings ──> films
    │            └──────> halls
    └───────────────────> halls
```

Films and halls know nothing about showings, yet a film or a hall must not be
deleted while a showing refers to it. Instead of importing the showings module
back (a circular dependency), `ShowingsService` registers a small "is this id
still used?" check with `FilmsService` and `HallsService` when it is created.
`remove()` asks the registered checks and answers 409 if any of them says yes.

### Where the checks live

- **DTOs** (`class-validator`) check the shape of the input: required fields,
  types, ranges, date formats and the uniqueness of seats inside one request.
- **Services** check the rules that need the stored state: that a film and a
  hall exist, that a seat fits into the hall, that a seat is still free, and
  that nothing refers to a record that is being deleted.

`ValidationPipe` is registered globally with `whitelist: true`, so fields that
are not declared in a DTO never reach a service.

## Rules worth knowing

- Prices are integers in the smallest currency unit: a ticket for 125.00 is
  stored as `12500`. The total price of a booking is the showing price
  multiplied by the number of seats.
- `startsAt` accepts any ISO 8601 date that is not in the past and is stored
  in UTC.
- The `date` filter of `GET /showings` (`YYYY-MM-DD`) selects the showings that
  start on that day in UTC.
- Showings are ordered by start time; showings that start at the same moment
  are ordered by `id`.
- A booking is all or nothing: if one of the requested seats is already taken,
  the answer is 409 and none of the seats is booked.

## Tests and code quality

```bash
npm test            # unit tests
npm run test:e2e    # end-to-end tests for every route and error case
npm run lint        # ESLint
npm run format      # Prettier
```
