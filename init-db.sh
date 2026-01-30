#!/bin/sh
# Initialize database with Prisma schema
cd /app
npx prisma db push --accept-data-loss || true
echo "Database initialized"
