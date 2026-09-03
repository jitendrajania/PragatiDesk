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

# Start production server
CMD ["node", "dist/index.js"]
