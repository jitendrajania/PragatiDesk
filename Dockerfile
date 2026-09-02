FROM node:20-alpine

WORKDIR /app

# Copy server package files and prisma schema
COPY server/package*.json ./
COPY server/prisma ./prisma/

# Install dependencies and generate Prisma Client for PostgreSQL
RUN npm install
RUN npx prisma generate

# Copy server typescript source code
COPY server/tsconfig.json ./
COPY server/src ./src/

# Build TypeScript server
RUN npm run build

EXPOSE 5050

# Apply schema migrations to PostgreSQL, run non-destructive seed, and start production server
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node prisma/seed.ts && node dist/index.js"]
