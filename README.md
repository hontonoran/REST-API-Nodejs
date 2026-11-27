# REST API Дошки оголошень

REST API для дошки оголошень з JWT-автентифікацією, авторизацією та контролем доступу. Реалізовано в рамках курсового завдання магістратури.

## Загальний опис

Чистий JSON API без рендерингу HTML. Бекенд обслуговує клієнтів (React-застосунки, мобільні додатки тощо) через HTTP-запити.

Користувачі можуть публікувати, редагувати та видаляти власні оголошення. Анонімні відвідувачі бачать список оголошень і можуть переглядати деталі. Для створення оголошення потрібна реєстрація. Редагувати та видаляти можна лише власні оголошення.

Автентифікація — JWT з refresh токенами. Access token: 15 хвилин, refresh token: 7 днів. Token rotation для refresh токенів.

Production-покращення:

- **Безпека** — `helmet` (безпечні заголовки), `cors` (лише origins з `ALLOWED_ORIGINS`, інші отримують `403`), rate limiting на `/auth/*` — 10 запитів з IP за 15 хвилин, далі `429`.
- **Логування** — `pino` + `pino-http`: кожен HTTP-запит, а також реєстрація, вхід, створення оголошення і завантаження фото. Заголовки `Authorization` і `Cookie` у логах приховані.
- **Фото оголошення** — `multer` тимчасово зберігає файл в `uploads/`, файл завантажується в Cloudinary, локальна копія видаляється. У базі зберігається лише `imageUrl` (опціональне поле).
- **Тести** — Vitest + Supertest на окремій тестовій базі.

## Технологічний стек

| Технологія                     | Опис                            |
| ------------------------------ | ------------------------------- |
| Node.js                        | Середовище виконання            |
| Express 5                      | Веб-фреймворк                   |
| Prisma 7                       | ORM для бази даних (PostgreSQL) |
| Zod                            | Валідація вхідних даних         |
| bcrypt                         | Хешування паролів               |
| jsonwebtoken                   | JWT-автентифікація              |
| @asteasolutions/zod-to-openapi | Генерація OpenAPI документації  |
| swagger-ui-express             | Swagger UI                      |
| dotenv                         | Змінні середовища               |
| helmet, cors                   | Заголовки безпеки, CORS         |
| express-rate-limit             | Rate limiting auth-маршрутів    |
| pino, pino-http, pino-pretty   | Логування                       |
| multer, cloudinary             | Завантаження фото               |
| Vitest, Supertest              | Тестування                      |

## Встановлення

1. Встановіть залежності:

```bash
npm install
```

2. Запустіть PostgreSQL (наприклад, у Docker):

```bash
docker run -d --name announcements-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=announcements \
  -p 5432:5432 \
  postgres:17
```

Якщо порт 5432 вже зайнятий, використайте `-p 5433:5432` і порт `5433` у `DATABASE_URL`.
Після перезавантаження комп'ютера контейнер запускається командою `docker start announcements-db`.

3. Створіть файл конфігурації:

```bash
cp .env.example .env
```

4. Налаштуйте `.env` (значення нижче відповідають контейнеру з кроку 2):

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/announcements?schema=public
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/announcements_test?schema=public
JWT_SECRET=your-secret-key-at-least-256-bits-long
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Тестова база (`TEST_DATABASE_URL`) створюється і мігрується автоматично при `npm test`. Тести очищають її перед кожним тестом, тому вона має бути окремою від основної.

5. Застосуйте міграцію та згенеруйте Prisma Client:

```bash
npm run prisma:migrate
npm run prisma:generate
```

6. Запустіть проект:

```bash
npm run dev
```

## Маршрути

### Auth

| Метод | Шлях             | Опис                          | Auth |
| ----- | ---------------- | ----------------------------- | ---- |
| POST  | `/auth/register` | Реєстрація користувача        | Ні   |
| POST  | `/auth/login`    | Вхід користувача              | Ні   |
| POST  | `/auth/refresh`  | Оновлення токенів             | Ні   |
| POST  | `/auth/logout`   | Вихід                         | Так  |
| GET   | `/auth/me`       | Профіль поточного користувача | Так  |

### Оголошення

| Метод  | Шлях                 | Опис                                      | Auth |
| ------ | -------------------- | ----------------------------------------- | ---- |
| GET    | `/announcements`     | Список з пагінацією, пошуком, сортуванням | Ні   |
| GET    | `/announcements/:id` | Деталі оголошення                         | Ні   |
| POST   | `/announcements`     | Створення оголошення (+ фото)             | Так  |
| PATCH  | `/announcements/:id` | Часткове оновлення (власне, + фото)       | Так  |
| DELETE | `/announcements/:id` | Видалення (власне)                        | Так  |

## Параметри запитів

### GET /announcements

| Параметр | Тип   | Опис                                            |
| -------- | ----- | ----------------------------------------------- |
| `search` | query | Пошук по назві (нечутливий до регістру)         |
| `sort`   | query | `newest` (за замовчуванням) або `oldest`        |
| `page`   | query | Номер сторінки (число > 0), 10 записів/сторінка |

### POST /auth/register

| Поле       | Вимоги                                  |
| ---------- | --------------------------------------- |
| `username` | рядок, обов'язковий, 3–30 символів      |
| `email`    | email, обов'язковий                     |
| `password` | рядок, обов'язковий, мінімум 6 символів |
| `name`     | рядок, обов'язковий, мінімум 2 символи  |

### POST /announcements

| Поле          | Вимоги                                                 |
| ------------- | ------------------------------------------------------ |
| `title`       | рядок, обов'язковий, 5–50 символів                     |
| `description` | рядок, обов'язковий, мінімум 10 символів               |
| `price`       | число, обов'язкове, > 0                                |
| `category`    | рядок, обов'язковий: `sale`, `service`, `job`, `other` |

| `image`       | файл-зображення, опціональний, до 5 МБ                 |

POST і PATCH приймають `multipart/form-data` (поле файлу — `image`). JSON без фото теж працює.
PATCH використовує ті ж правила валідації, але всі поля опціональні (хоча б одне поле або фото має бути присутнє).

Приклад:

```bash
curl -X POST http://localhost:3000/announcements \
  -H "Authorization: Bearer <accessToken>" \
  -F title="Продам велосипед" -F description="Trek у відмінному стані, розмір рами L" \
  -F price=8500 -F category=sale -F image=@bike.jpg
```

## Структура проекту

```
boilerplate/
├── prisma/
│   ├── schema.prisma
│   ├── client.ts
│   └── migrations/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── announcements.controller.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── upload.ts          # multer + Cloudinary
│   │   └── validate.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── announcements.routes.ts
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   └── announcements.validator.ts
│   ├── logger.ts              # pino
│   └── openapi.ts
├── tests/
│   ├── auth.test.ts
│   ├── announcements.test.ts
│   ├── security.test.ts
│   └── global-setup.ts
├── uploads/                   # тимчасові файли multer
├── app.ts                     # Express-застосунок (без listen)
├── index.ts                   # запуск сервера
├── vitest.config.ts
├── .env.example
├── .env
├── package.json
├── tsconfig.json
├── prisma.config.ts
└── README.md
```

## Бойлерплейт

Мінімальний стартовий набір:

- `package.json` з усіма залежностями
- `tsconfig.json` з налаштуваннями TypeScript
- `src/openapi.ts` з ініціалізованим registry та `bearerAuth`
- `prisma/client.ts` з ініціалізованим Prisma Client (PostgreSQL через `@prisma/adapter-pg`)
- `prisma.config.ts` з конфігурацією Prisma
- `.env.example` з шаблоном змінних середовища

## Доступні скрипти

| Команда                   | Опис                                 |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Запуск з hot reload (`tsx --watch`)  |
| `npm start`               | Запуск у виробничому режимі          |
| `npm test`                | Запуск тестів (Vitest)               |
| `npm run test:watch`      | Тести в режимі спостереження         |
| `npm run prisma:migrate`  | Створення та застосування міграцій   |
| `npm run prisma:generate` | Генерація Prisma Client              |

## Документація API

Swagger UI доступний за адресою: http://localhost:3000/api-docs

## Prisma schema

Три моделі: `User`, `RefreshToken`, `Announcement`.

- `User` — `username` (унікальний), хешований `password`, `email` (унікальний), `name`, `createdAt`
- `RefreshToken` — `token` (унікальний), зв'язок з `User`
- `Announcement` — `title`, `description`, `price`, `category`, опціональний `imageUrl`, зв'язок з `User`, `createdAt`, `updatedAt`

## Ліцензія

ISC
