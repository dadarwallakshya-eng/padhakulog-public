import { defineConfig } from 'prisma/config';

// The app talks to Cloudflare D1. This local file is only used by Prisma's
// tooling (e.g. `prisma migrate diff`) to produce the SQL in /migrations.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: 'file:./prisma/tooling.db' },
});
