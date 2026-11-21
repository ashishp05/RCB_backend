# Running the Box Cricket Backend on macOS

This guide takes a Mac with nothing installed to a running API at `http://localhost:4000`. It
works on Apple Silicon (M1–M4) and Intel Macs. It takes about 15 minutes.

**You will install:**
- Homebrew
- Node.js 24 or newer
- PostgreSQL 18

**Then you will:** configure `.env`, create the database tables, seed the demo data, and start
the server.

> Commands go in the **Terminal** app (Applications → Utilities → Terminal). Lines starting with
> `#` are comments; you don't need to type them.

---

## 1. Install Homebrew

Homebrew is the standard package manager for macOS. Skip this step if `brew --version` already
prints a version.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

When it finishes, follow the **"Next steps"** it prints. On Apple Silicon, that adds Homebrew to
your PATH:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Check it works:

```bash
brew --version
```

You may also be asked to install the **Xcode Command Line Tools**. Accept it: the `bcrypt`
package needs them to compile. You can also install them yourself with `xcode-select --install`.

---

## 2. Install Node.js (version 24 or newer)

The project requires Node **>= 24** (see `engines` in `package.json`).

```bash
brew install node
node -v        # must print v24.x or higher
npm -v
```

<details>
<summary>Prefer to manage several Node versions? Use nvm instead.</summary>

```bash
brew install nvm
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"; . "$(brew --prefix nvm)/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 24
nvm use 24
```

</details>

---

## 3. Install and start PostgreSQL

### 3.1 Install

```bash
brew install postgresql@18
```

Homebrew installs versioned PostgreSQL "keg-only", which means its commands (`psql`, `createdb`)
are not on your PATH yet. Add them:

```bash
echo 'export PATH="$(brew --prefix postgresql@18)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
psql --version        # psql (PostgreSQL) 18.x
```

### 3.2 Start the server

This starts PostgreSQL now and again on every login:

```bash
brew services start postgresql@18
```

Check it is accepting connections:

```bash
pg_isready
# /tmp:5432 - accepting connections
```

### 3.3 Create the database user and database

> **Important macOS difference:** Homebrew's PostgreSQL does **not** create a `postgres` user
> with a password, as Linux installers do. The only user is **your macOS username**, with no
> password. Create the user the app will connect as.

Pick a password (example: `boxcricket_dev`) and run:

```bash
# Create a "postgres" login user with that password
psql postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'boxcricket_dev';"

# Create the app database, owned by that user
createdb -O postgres box_cricket_db
```

If the first command says `role "postgres" already exists`, just set its password instead:

```bash
psql postgres -c "ALTER ROLE postgres WITH LOGIN PASSWORD 'boxcricket_dev';"
```

Test the login. It should print a table with `1`:

```bash
psql "postgresql://postgres:boxcricket_dev@localhost:5432/box_cricket_db" -c "SELECT 1;"
```

<details>
<summary>Alternative: Postgres.app (a GUI app instead of Homebrew)</summary>

1. Download it from <https://postgresapp.com>, drag it to Applications, open it, and click
   **Initialize**.
2. Add its tools to your PATH:
   `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp`
3. Open a new Terminal, then run the same `CREATE ROLE` and `createdb` commands as above.

Run **either** Homebrew PostgreSQL **or** Postgres.app, not both: they both use port 5432.

</details>

---

## 4. Get the project and install dependencies

```bash
# Clone, or copy the project folder onto your Mac, then:
cd RCB_backend
npm install
```

`npm install` also runs `prisma generate`, which builds the database client. If npm reports that
it skipped install scripts, approve the ones the project lists under `allowScripts` in
`package.json` (`prisma`, `@prisma/engines`, `bcrypt`, `esbuild`), then run `npm install` again.

---

## 5. Configure `.env`

```bash
cp .env.example .env
```

Open `.env` in your editor (for example, `open -e .env`) and set at least these:

| Variable | What to put |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:boxcricket_dev@localhost:5432/box_cricket_db?schema=public`, using the password you chose in step 3.3 |
| `JWT_SECRET` | A random string of **at least 32 characters**. Generate one with `openssl rand -hex 32` |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | The first admin login the seed will create (password: 8+ characters, with a letter and a digit) |
| `DISABLE_EMAIL` | `true` for local development unless you have SMTP set up. Password-reset links are then printed in the server console |

Everything else can stay as it is for local development:
- **Payments:** with no Razorpay keys, the server runs in **mock mode**, and any payment
  signature verifies.
- **SMS:** `SMS_PROVIDER=console` prints messages instead of sending them.
- **CORS:** `WHITE_LIST_URLS` is the list of frontend origins allowed to call the API.
  `localhost` and `192.168.x.x` origins are always allowed in development.

> If the password contains special characters such as `@ : / # ?`, URL-encode them in
> `DATABASE_URL` (for example, `@` becomes `%40`), or choose a password without them.

---

## 6. Create the tables and seed data

```bash
npx prisma migrate deploy     # creates all tables
npm run db:seed               # venue, pitch, prices, 4 offers, first admin account
```

Expected output:

```
All migrations have been successfully applied.
Seeded venue "arena", pitch "main", 4 offers and admin admin@riverside.example.
```

The seed is safe to run again. It never overwrites a password you have changed.

---

## 7. Run the server

```bash
npm run dev
```

```
✅ Loaded environment: .env
Server running at http://localhost:4000
```

The server reloads automatically when you edit a `.ts` file. Stop it with **Ctrl + C**.

### Check that it works

Open a second Terminal tab (**⌘ T**):

```bash
curl http://localhost:4000/
# {"success":true,"message":"ok"}

curl http://localhost:4000/api/v1/venues/arena
# {"id":"arena","name":"The Riverside Cricket Box", ... }

curl -X POST http://localhost:4000/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@riverside.example","password":"Admin@12345"}'
# {"token":"eyJ...","tokenType":"Bearer", ... }
```

Use the `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` from your `.env` if you changed them. **Change
that password after the first login** (`POST /api/v1/admin/auth/change-password`).

Every endpoint, with request and response examples, is documented in [API.md](API.md).

---

## Everyday commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the dev server with auto-reload |
| `npm test` | Run the unit tests |
| `npm run typecheck` · `npm run lint` · `npm run format` | Code checks and formatting |
| `npm run db:studio` | Open Prisma Studio, a web UI for browsing and editing data |
| `npm run db:seed` | Re-run the seed |
| `npx prisma migrate deploy` | Apply new migrations after pulling changes |
| `npm run db:migrate -- --name <change>` | Create a new migration after editing `prisma/schema.prisma` |
| `npm run build` then `npm start` | Production build and run (the build also runs lint, format check and typecheck) |
| `brew services stop postgresql@18` | Stop PostgreSQL |
| `brew services restart postgresql@18` | Restart PostgreSQL |

**Start over with an empty database.** ⚠️ This **deletes all data**:

```bash
npx prisma migrate reset      # drops everything, re-applies migrations, runs the seed
```

---

## Troubleshooting

| Error | Cause and fix |
| :--- | :--- |
| `❌ Cannot connect to PostgreSQL at localhost:5432/...` or Prisma `P1001` | PostgreSQL is not running. Run `brew services start postgresql@18`, then check `pg_isready` |
| `password authentication failed for user "postgres"` (`28P01`) | The password in `DATABASE_URL` doesn't match. Reset it with `psql postgres -c "ALTER ROLE postgres WITH PASSWORD 'boxcricket_dev';"` and update `.env` |
| `role "postgres" does not exist` | You skipped the `CREATE ROLE` command in step 3.3 |
| `database "box_cricket_db" does not exist` (`P1003`) | Run `createdb -O postgres box_cricket_db` |
| `psql: command not found` | The PostgreSQL PATH line from step 3.1 is missing. Re-run it, then `source ~/.zshrc` |
| `relation "venues" does not exist` / `The table ... does not exist` | Run `npx prisma migrate deploy`, then `npm run db:seed` |
| `❌ Missing/invalid environment variables ...: JWT_SECRET` | `JWT_SECRET` must be at least 32 characters (`openssl rand -hex 32`) |
| `Venue not found` from `/venues/arena` | The seed hasn't run yet: `npm run db:seed` |
| `Invalid email or password` on admin login | Use the `ADMIN_SEED_*` values that were in `.env` **when the seed first ran**. The seed doesn't change an existing admin's password |
| `Too many failed attempts` (429) | 5 wrong passwords lock the account for 15 minutes. Wait, or ask another admin to reset it |
| `EADDRINUSE: address already in use :::4000` | Something else is using port 4000. Find it with `lsof -i :4000`, or change `PORT` in `.env` |
| Port 5432 already in use | Postgres.app or another PostgreSQL is running. Quit it, or run only one of them |
| `@prisma/client did not initialize yet` / missing Prisma types | Run `npm run db:generate` |
| `bcrypt` fails to build during `npm install` | Install the Xcode Command Line Tools (`xcode-select --install`), then `rm -rf node_modules && npm install` |
| `node: --import tsx` / syntax errors on start | Your Node is too old. `node -v` must be 24 or newer |

### Optional: a GUI for the database

- **pgAdmin:** `brew install --cask pgadmin4`
- **TablePlus:** `brew install --cask tableplus`
- **Prisma Studio:** `npm run db:studio`, already included in the project

Connect with host `localhost`, port `5432`, user `postgres`, your password, and database
`box_cricket_db`.
