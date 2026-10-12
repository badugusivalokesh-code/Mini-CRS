/**
 * seed-demo.ts
 *
 * Seeds the demo@clientra.app account with realistic customers, deals, and tasks.
 * Safe to re-run: upserts only the known demo records owned by the demo user.
 *
 * Dataset:
 *   - 1 Demo User (demo@clientra.app)
 *   - 8 Customers
 *   - 10 Deals (Lead, Qualified, Proposal, Won, Lost)
 *   - 12 Tasks (3 due today, 3 overdue, 1 completed, 5 upcoming)
 *
 * Usage:
 *   npx tsx src/scripts/seed-demo.ts
 */

import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import dotenv from 'dotenv'
import { connectDB, disconnectDB } from '../config/db'
import { CustomerModel } from '../models/Customer'
import { DealModel } from '../models/Deal'
import { TaskModel } from '../models/Task'
import { UserModel } from '../models/User'

dotenv.config()

// ─── Env ─────────────────────────────────────────────────────────────────────

const DEMO_EMAIL = 'demo@clientra.app'
const SEED_DATE = new Date()

function requiredDemoPassword(): string {
  const password = process.env.DEMO_PASSWORD
  if (!password || password.trim() === '' || password.startsWith('replace-with-')) {
    throw new Error('DEMO_PASSWORD environment variable is required to seed the demo user.')
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('DEMO_PASSWORD must satisfy the authentication password length limits.')
  }
  return password
}
const DEMO_PASSWORD = requiredDemoPassword()

function daysFromToday(days: number): Date {
  const date = new Date(SEED_DATE)
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date
}

function daysAgoInCurrentMonth(daysAgo: number): Date {
  const today = SEED_DATE
  const day = Math.max(1, today.getUTCDate() - daysAgo)
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day, 12))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await connectDB()

  // ── 1. Upsert demo user ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const demoUser = await UserModel.findOneAndUpdate(
    { email: DEMO_EMAIL },
    { $set: { email: DEMO_EMAIL, passwordHash } },
    { upsert: true, new: true, runValidators: true },
  ).exec()
  if (!demoUser) throw new Error('Unable to create or update the demo user.')
  console.log('✅  Demo user ready')

  const userId: Types.ObjectId = demoUser._id

  // ── 2. Customers — upsert only records owned by the demo user ─────────────
  const customerSeeds = [
    {
      name: 'Arjun Reddy',
      company: 'Vertex Technologies',
      status: 'Active',
      email: 'arjun@vertextech.com',
      phone: '+91 98765 43210',
      notes: 'Enterprise account lead. Overseeing digital infrastructure overhaul.',
      user: userId,
    },
    {
      name: 'Priya Sharma',
      company: 'Nova Solutions',
      status: 'Active',
      email: 'priya@novasolutions.com',
      phone: '+91 98765 43211',
      notes: 'VP of Technology. Leading cloud migration and CRM rollout.',
      user: userId,
    },
    {
      name: 'Rahul Mehta',
      company: 'BluePeak Systems',
      status: 'Active',
      email: 'rahul@bluepeaksystems.com',
      phone: '+91 98765 43212',
      notes: 'CTO evaluating scalable backend modernization.',
      user: userId,
    },
    {
      name: 'Ananya Rao',
      company: 'Greenline Digital',
      status: 'Active',
      email: 'ananya@greenlinedigital.com',
      phone: '+91 98765 43213',
      notes: 'Product director managing cross-platform mobile initiatives.',
      user: userId,
    },
    {
      name: 'Kiran Kumar',
      company: 'Apex Industries',
      status: 'Inactive',
      email: 'kiran@apexindustries.com',
      phone: '+91 98765 43214',
      notes: 'Former manufacturing client. Legacy contract expired in Q3.',
      user: userId,
    },
    {
      name: 'Sneha Patel',
      company: 'BrightWorks',
      status: 'Active',
      email: 'sneha@brightworks.com',
      phone: '+91 98765 43215',
      notes: 'Head of Analytics. Fast-growing enterprise reporting division.',
      user: userId,
    },
    {
      name: 'Vikram Singh',
      company: 'CloudBridge',
      status: 'Active',
      email: 'vikram@cloudbridge.com',
      phone: '+91 98765 43216',
      notes: 'Infrastructure architect focused on enterprise security.',
      user: userId,
    },
    {
      name: 'Neha Verma',
      company: 'Orbit Consulting',
      status: 'Inactive',
      email: 'neha@orbitconsulting.com',
      phone: '+91 98765 43217',
      notes: 'Advisory partner. Support contract retired.',
      user: userId,
    },
  ]
  const customers = await Promise.all(customerSeeds.map((customer) =>
    CustomerModel.findOneAndUpdate(
      { user: userId, email: customer.email },
      { $set: customer },
      { upsert: true, new: true, runValidators: true },
    ).exec(),
  ))

  const [
    arjun,
    priya,
    rahul,
    ananya,
    kiran,
    sneha,
    vikram,
    neha,
  ] = customers

  console.log(`✅  Seeded ${customers.length} customers`)

  // ── 3. Deals — 10 required ────────────────────────────────────────────────
  // All 5 stages represented: Lead, Qualified, Proposal, Won, Lost.
  const dealSeeds = [
    // 1. Enterprise Platform — 850000, Lead, Arjun Reddy
    {
      title: 'Enterprise Platform',
      value: 850000,
      stage: 'Lead',
      expectedCloseDate: daysFromToday(34),
      customer: arjun._id,
      user: userId,
    },
    // 2. Cloud Migration — 1200000, Lead, Rahul Mehta
    {
      title: 'Cloud Migration',
      value: 1200000,
      stage: 'Lead',
      expectedCloseDate: daysFromToday(49),
      customer: rahul._id,
      user: userId,
    },
    // 3. CRM Integration — 650000, Qualified, Priya Sharma
    {
      title: 'CRM Integration',
      value: 650000,
      stage: 'Qualified',
      expectedCloseDate: daysFromToday(29),
      customer: priya._id,
      user: userId,
    },
    // 4. Mobile App Development — 900000, Qualified, Ananya Rao
    {
      title: 'Mobile App Development',
      value: 900000,
      stage: 'Qualified',
      expectedCloseDate: daysFromToday(54),
      customer: ananya._id,
      user: userId,
    },
    // 5. Analytics Platform — 1500000, Proposal, Sneha Patel
    {
      title: 'Analytics Platform',
      value: 1500000,
      stage: 'Proposal',
      expectedCloseDate: daysFromToday(14),
      customer: sneha._id,
      user: userId,
    },
    // 6. Security Upgrade — 750000, Proposal, Vikram Singh
    {
      title: 'Security Upgrade',
      value: 750000,
      stage: 'Proposal',
      expectedCloseDate: daysFromToday(25),
      customer: vikram._id,
      user: userId,
    },
    // 7. Website Revamp — 500000, Won, Arjun Reddy
    {
      title: 'Website Revamp',
      value: 500000,
      stage: 'Won',
      expectedCloseDate: daysAgoInCurrentMonth(5),
      customer: arjun._id,
      user: userId,
    },
    // 8. Data Migration — 450000, Won, Priya Sharma
    {
      title: 'Data Migration',
      value: 450000,
      stage: 'Won',
      expectedCloseDate: daysAgoInCurrentMonth(2),
      customer: priya._id,
      user: userId,
    },
    // 9. Legacy Upgrade — 300000, Lost, Kiran Kumar
    {
      title: 'Legacy Upgrade',
      value: 300000,
      stage: 'Lost',
      expectedCloseDate: daysFromToday(-22),
      customer: kiran._id,
      user: userId,
    },
    // 10. Support Contract — 250000, Lost, Neha Verma
    {
      title: 'Support Contract',
      value: 250000,
      stage: 'Lost',
      expectedCloseDate: daysFromToday(-27),
      customer: neha._id,
      user: userId,
    },
  ]
  const deals = await Promise.all(dealSeeds.map((deal) =>
    DealModel.findOneAndUpdate(
      { user: userId, title: deal.title },
      { $set: deal },
      { upsert: true, new: true, runValidators: true },
    ).exec(),
  ))

  const [
    dealEnterprise,
    dealCloud,
    dealCrm,
    dealMobile,
    dealAnalytics,
    dealSecurity,
    , // dealWebsite (no tasks linked)
    dealDataMigration,
    dealLegacy,
    // dealSupport (no tasks linked)
  ] = deals

  console.log(`✅  Seeded ${deals.length} deals`)

  // ── 4. Tasks — 12 required ────────────────────────────────────────────────
  // Three due today, five upcoming, three overdue, and one completed.
  const taskSeeds = [
    // 1. Send proposal — due today, High, Incomplete, Sneha Patel, Analytics Platform
    {
      title: 'Send proposal',
      dueDate: daysFromToday(0),
      priority: 'High',
      completed: false,
      customer: sneha._id,
      deal: dealAnalytics._id,
      user: userId,
    },
    // 2. Follow up with client — due today, Medium, Incomplete, Arjun Reddy, Enterprise Platform
    {
      title: 'Follow up with client',
      dueDate: daysFromToday(0),
      priority: 'Medium',
      completed: false,
      customer: arjun._id,
      deal: dealEnterprise._id,
      user: userId,
    },
    // 3. Review contract — due today, High, Incomplete, Priya Sharma, CRM Integration
    {
      title: 'Review contract',
      dueDate: daysFromToday(0),
      priority: 'High',
      completed: false,
      customer: priya._id,
      deal: dealCrm._id,
      user: userId,
    },
    // 4. Prepare presentation — due in 2 days, Medium, Incomplete, Rahul Mehta, Cloud Migration
    {
      title: 'Prepare presentation',
      dueDate: daysFromToday(2),
      priority: 'Medium',
      completed: false,
      customer: rahul._id,
      deal: dealCloud._id,
      user: userId,
    },
    // 5. Schedule technical discussion — due in 3 days, High, Incomplete, Vikram Singh, Security Upgrade
    {
      title: 'Schedule technical discussion',
      dueDate: daysFromToday(3),
      priority: 'High',
      completed: false,
      customer: vikram._id,
      deal: dealSecurity._id,
      user: userId,
    },
    // 6. Send project estimate — due in 5 days, Low, Incomplete, Ananya Rao, Mobile App Development
    {
      title: 'Send project estimate',
      dueDate: daysFromToday(5),
      priority: 'Low',
      completed: false,
      customer: ananya._id,
      deal: dealMobile._id,
      user: userId,
    },
    // 7. Update requirements — due in 7 days, Medium, Incomplete, Arjun Reddy, Enterprise Platform
    {
      title: 'Update requirements',
      dueDate: daysFromToday(7),
      priority: 'Medium',
      completed: false,
      customer: arjun._id,
      deal: dealEnterprise._id,
      user: userId,
    },
    // 8. Prepare onboarding — due in 9 days, High, Incomplete, Priya Sharma, Data Migration
    {
      title: 'Prepare onboarding',
      dueDate: daysFromToday(9),
      priority: 'High',
      completed: false,
      customer: priya._id,
      deal: dealDataMigration._id,
      user: userId,
    },
    // 9. Follow up on payment — overdue by 3 days, High, Sneha Patel, Analytics Platform
    {
      title: 'Follow up on payment',
      dueDate: daysFromToday(-3),
      priority: 'High',
      completed: false,
      customer: sneha._id,
      deal: dealAnalytics._id,
      user: userId,
    },
    // 10. Send revised quotation — overdue by 5 days, Medium, Rahul Mehta, Cloud Migration
    {
      title: 'Send revised quotation',
      dueDate: daysFromToday(-5),
      priority: 'Medium',
      completed: false,
      customer: rahul._id,
      deal: dealCloud._id,
      user: userId,
    },
    // 11. Review old proposal — overdue by 8 days, Low, Kiran Kumar, Legacy Upgrade
    {
      title: 'Review old proposal',
      dueDate: daysFromToday(-8),
      priority: 'Low',
      completed: false,
      customer: kiran._id,
      deal: dealLegacy._id,
      user: userId,
    },
    // 12. Complete onboarding — completed, Priya Sharma, Data Migration
    {
      title: 'Complete onboarding',
      dueDate: daysFromToday(-2),
      priority: 'High',
      completed: true,
      customer: priya._id,
      deal: dealDataMigration._id,
      user: userId,
    },
  ]
  const tasks = await Promise.all(taskSeeds.map((task) =>
    TaskModel.findOneAndUpdate(
      { user: userId, title: task.title },
      { $set: task },
      { upsert: true, new: true, runValidators: true },
    ).exec(),
  ))

  console.log(`✅  Seeded ${tasks.length} tasks`)
  console.log('\n🎉  Demo data seeded successfully!')
  console.log(`    Customers: ${customers.length}`)
  console.log(`    Deals:     ${deals.length}`)
  console.log(`    Tasks:     ${tasks.length}`)

  await disconnectDB()
}

main().catch(async (error: unknown) => {
  console.error(
    '❌  Seed failed.',
    error instanceof Error ? `Cause: ${error.name}.` : '',
    'Check environment configuration and database connectivity.',
  )
  await disconnectDB().catch(() => undefined)
  process.exit(1)
})
