# CommitFlow

CommitFlow is a web app that automates and manages GitHub contribution activity. Users log in with their GitHub account, choose or create a target repository, and configure how many commits should be created per day and at what time. The app also supports manually backfilling past dates and provides a dashboard with a contribution heatmap, stats, and full commit history.

> **Note:** CommitFlow is intended for legitimate use cases such as backfilling missed real work or maintaining a consistent activity log — not for misrepresenting your actual contribution history.

---

## Features

- **GitHub-only authentication** — no separate passwords, login via GitHub OAuth
- **Repo onboarding** — use an existing repository or create a new one directly from the app
- **Scheduled automated commits** — configurable commits per day, time, and timezone
- **Custom backfill** — manually create commits for a specific past date
- **Commit management** — view and delete pending scheduled entries
- **Dashboard visualization** — real GitHub contribution heatmap, streak tracking, monthly stats, recent activity feed
- **Full history log** — paginated, filterable table of all commit activity
- **Profile & account control** — view connected GitHub info, delete account
- **Security** — encrypted GitHub tokens at rest, input validation, rate limiting on sensitive endpoints

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS |
| Authentication | NextAuth.js (Auth.js) — GitHub provider only |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 6 |
| GitHub Integration | GitHub REST API + GraphQL API |
| Visualization | react-calendar-heatmap |
| Validation | Zod |
| Token Security | Node.js `crypto` (AES-256-GCM) |
| Scheduler | External cron (cron-job.org) triggering an internal API route |
| Hosting | Vercel |

---

## Project Structure

```
commitflow/
├── prisma/
│   └── schema.prisma
├── public/
│   └── images/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                       # Home
│   │   ├── globals.css
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                 # Sidebar + topbar shell
│   │   │   ├── page.tsx                   # Overview
│   │   │   ├── settings/page.tsx
│   │   │   ├── commits/page.tsx
│   │   │   ├── custom/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── settings/route.ts
│   │       ├── commits/route.ts
│   │       ├── commits/custom/route.ts
│   │       ├── github/repos/route.ts
│   │       ├── github/create-repo/route.ts
│   │       ├── github/commit/route.ts
│   │       ├── github/contributions/route.ts
│   │       ├── cron/run-due-commits/route.ts
│   │       └── account/delete/route.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   ├── dashboard/
│   │   │   ├── RepoOnboarding.tsx
│   │   │   ├── ContributionHeatmap.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── DeleteAccountButton.tsx
│   │   └── forms/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── github.ts
│   │   ├── encryption.ts
│   │   ├── validators.ts
│   │   └── rateLimit.ts
│   ├── hooks/
│   └── types/
├── .env
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

---

## Database Schema

### User

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| name | String? | From GitHub profile |
| email | String? | Unique, used as session identifier |
| githubId | String | Unique, GitHub account ID |
| githubUsername | String | GitHub login |
| githubToken | String | Encrypted access token (AES-256-GCM) |
| repoName | String? | Selected target repository |
| commitsPerDay | Int | Default `1` |
| commitTime | String | `"HH:MM"` format, default `"18:00"` |
| timezone | String | Default `"UTC"` |
| active | Boolean | Default `true` |
| createdAt / updatedAt | DateTime | |

### CommitLog

| Field | Type | Notes |
|---|---|---|
| id | String | Primary key |
| userId | String | Foreign key → User |
| scheduledFor | DateTime | Target date/time of the commit |
| count | Int | Number of commits in this batch |
| type | String | `"scheduled"` or `"custom"` |
| status | String | `"pending"`, `"done"`, or `"failed"` |
| note | String? | Optional note, or error message on failure |
| createdAt | DateTime | |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech))
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))

### 1. Clone and Install

```bash
git clone https://github.com/your-username/commitflow-app.git
cd commitflow-app
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=your_postgres_connection_string
NEXTAUTH_SECRET=generate_with_node_crypto
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
CRON_SECRET=generate_a_random_string
ENCRYPTION_SECRET=generate_a_32_byte_hex_string
```

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"      # CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"      # ENCRYPTION_SECRET
```

### 3. GitHub OAuth App Setup

In your OAuth App settings:

- **Homepage URL:** `http://localhost:3000`
- **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`

### 4. Database Setup

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## How the Automation Works

1. A user configures `commitsPerDay`, `commitTime`, and `timezone` in Settings.
2. An external cron service (e.g. cron-job.org) calls `POST /api/cron/run-due-commits` every 5 minutes, with an `Authorization: Bearer <CRON_SECRET>` header.
3. The endpoint checks all active users and finds anyone whose `commitTime` falls within a 5-minute window of the current time.
4. For each match, it checks `CommitLog` to avoid creating duplicate commits for the same day.
5. It creates the requested number of commits via the GitHub Contents API and logs the result.

Custom/backdated commits use a separate function (`createBackdatedCommit`) that builds commits manually through GitHub's Git Data API (blob → tree → commit → ref update), since the simpler Contents API cannot set a custom commit date.

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo into [Vercel](https://vercel.com).
3. Add all environment variables from `.env` into the Vercel project settings, using your **production URL** for `NEXTAUTH_URL`.
4. Update your GitHub OAuth App's callback URL to the deployed domain.
5. Deploy.
6. Set up an external cron job (e.g. cron-job.org) pointed at:
   ```
   POST https://your-app.vercel.app/api/cron/run-due-commits
   Authorization: Bearer <CRON_SECRET>
   ```
   Recommended interval: every 5 minutes.

---

## Security Notes

- GitHub access tokens are encrypted at rest using AES-256-GCM before being stored in the database.
- All write-facing API routes validate input with Zod schemas.
- The custom commit endpoint is rate-limited per user.
- The cron endpoint requires a secret bearer token and is not publicly callable without it.
- Commit authorship uses the user's real GitHub-verified email and name so that contributions are correctly attributed and counted on their GitHub profile.

---

## Known Limitations

- Backdated commits require the commit author's email to match a **verified** email on the user's GitHub account, or GitHub will not count them toward the contribution graph.
- The in-memory rate limiter resets on server restart and is not shared across multiple server instances — sufficient for small-scale use, but would need a shared store (e.g. Redis) at larger scale.
- Streak calculation compares calendar days based on server time; behavior near midnight may vary depending on the user's actual timezone versus the server's.

---