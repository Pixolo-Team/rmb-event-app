# rmb-event-app

Repo with a Next.js frontend and a NestJS backend, each fully standalone (own `package.json`, own `node_modules`, no root workspace).

## Stack

- **apps/frontend** — Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + ESLint + Prettier + Vitest
- **apps/backend** — NestJS 11 + TypeScript + ESLint + Prettier + Jest

## Getting Started

### Frontend

```bash
cd apps/frontend
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm run test
```

### Backend

```bash
cd apps/backend
npm install
npm run start:dev   # http://localhost:3001
npm run build
npm run lint
npm run test
```

## Folder Structure

```
apps/
  frontend/   # Next.js app
  backend/    # NestJS app
```

## Notes

- Database and authentication are not yet configured — added when needed.
- No Docker/CI setup yet.

## Contributing

TBD.

## License

TBD.
