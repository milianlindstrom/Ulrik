import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  // Create Sprint table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Sprint" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "start_date" DATETIME NOT NULL,
      "end_date" DATETIME NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "project_id" TEXT NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `;
  
  // Create SprintTask table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SprintTask" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sprint_id" TEXT NOT NULL,
      "task_id" TEXT NOT NULL,
      "story_points" REAL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'todo',
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("sprint_id") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE("sprint_id", "task_id")
    );
  `;
  
  // Create VelocityMetric table
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "VelocityMetric" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sprint_id" TEXT NOT NULL,
      "planned_points" REAL NOT NULL DEFAULT 0,
      "completed_points" REAL NOT NULL DEFAULT 0,
      "completed_tasks" INTEGER NOT NULL DEFAULT 0,
      "total_tasks" INTEGER NOT NULL DEFAULT 0,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("sprint_id") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `;
  
  // Create indexes
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Sprint_project_id_idx" ON "Sprint"("project_id");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Sprint_status_idx" ON "Sprint"("status");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Sprint_start_date_idx" ON "Sprint"("start_date");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Sprint_end_date_idx" ON "Sprint"("end_date");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SprintTask_sprint_id_idx" ON "SprintTask"("sprint_id");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SprintTask_task_id_idx" ON "SprintTask"("task_id");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "SprintTask_order_idx" ON "SprintTask"("order");`;
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "VelocityMetric_sprint_id_idx" ON "VelocityMetric"("sprint_id");`;
  
  console.log('✅ Sprint tables created successfully');
} catch (error) {
  console.error('❌ Error creating tables:', error.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
