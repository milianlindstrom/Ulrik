/**
 * Backup existing tasks before schema migration
 * Run this FIRST: tsx prisma/backup-tasks.ts
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

async function backup() {
  console.log('📦 Backing up existing tasks...\n')

  try {
    const tasks = await prisma.task.findMany()
    
    console.log(`✓ Found ${tasks.length} tasks`)
    
    const backupPath = join(__dirname, 'tasks-backup.json')
    writeFileSync(backupPath, JSON.stringify(tasks, null, 2))
    
    console.log(`✓ Backup saved to: ${backupPath}`)
    console.log('\n✅ Backup complete!')
    console.log('\nNext steps:')
    console.log('1. npx prisma db push (this will update schema)')
    console.log('2. tsx prisma/restore-tasks.ts (this will restore with projects)')
    
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

backup()
