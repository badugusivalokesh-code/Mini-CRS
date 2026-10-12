/**
 * seed-demo.ts
 *
 * Seeds the demo@clientra.app account with realistic customers, deals, and tasks.
 * Safe to re-run: idempotent — cleans previous demo records for the demo user
 * and re-creates the exact required dataset.
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

import dns from 'node:dns'
import bcrypt from 'bcryptjs'
import mongoose, { Types } from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// ─── Env ─────────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI
if (!MONGO_URI) {
  console.error('❌  MONGO_URI environment variable is required.')
  process.exit(1)
}

const DEMO_EMAIL = 'demo@clientra.app'
function requiredDemoPassword(): string {
  const password = process.env.DEMO_PASSWORD
  if (!password || password.trim() === '' || password.startsWith('replace-with-')) {
    throw new Error('DEMO_PASSWORD environment variable is required to seed the demo user.')
  }
  return password
}
const DEMO_PASSWORD = requiredDemoPassword()

// ─── Inline Mongoose schemas (mirrors app schemas) ────────────────────────────

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true })

const customerSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  email:   { type: String, required: true, trim: true, lowercase: true },
  phone:   { type: String, required: true, trim: true },
  status:  { type: String, required: true, trim: true },
  notes:   { type: String, required: true, trim: true },
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const dealSchema = new mongoose.Schema({
  title:             { type: String, required: true, trim: true },
  value:             { type: Number, required: true, min: 0 },
  stage:             { type: String, enum: ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'], required: true },
  expectedCloseDate: { type: Date, required: true },
  customer:          { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  user:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

const taskSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  dueDate:   { type: Date, required: true },
  priority:  { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  completed: { type: Boolean, required: true, default: false },
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
  deal:      { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

// Re-use existing models if registered (avoids OverwriteModelError)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const User     = (mongoose.models.User     as mongoose.Model<any>) ?? mongoose.model('User', userSchema)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Customer = (mongoose.models.Customer as mongoose.Model<any>) ?? mongoose.model('Customer', customerSchema)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Deal     = (mongoose.models.Deal     as mongoose.Model<any>) ?? mongoose.model('Deal', dealSchema)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Task     = (mongoose.models.Task     as mongoose.Model<any>) ?? mongoose.model('Task', taskSchema)

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // DNS fix for Atlas in certain environments
  try { dns.setServers(['8.8.8.8']) } catch { /* ignore */ }

  await mongoose.connect(MONGO_URI as string)
  console.log('✅  MongoDB connected')

  // ── 1. Upsert demo user ───────────────────────────────────────────────────
  let demoUser = await User.findOne({ email: DEMO_EMAIL }).select('+passwordHash').exec()
  if (!demoUser) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
    demoUser = await User.create({ email: DEMO_EMAIL, passwordHash })
    console.log('✅  Created demo user')
  } else {
    console.log('ℹ️   Demo user already exists')
  }

  const userId: Types.ObjectId = demoUser._id

  // ── 2. Clean previous demo records for this user (Idempotent seed) ───────
  await Task.deleteMany({ user: userId }).exec()
  await Deal.deleteMany({ user: userId }).exec()
  await Customer.deleteMany({ user: userId }).exec()
  console.log('ℹ️   Cleaned previous demo records')

  // ── 3. Customers — 8 required ─────────────────────────────────────────────
  const customers = await Customer.insertMany([
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
  ])

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

  console.log(`✅  Created ${customers.length} customers`)

  // ── 4. Deals — 10 required ────────────────────────────────────────────────
  // All 5 stages represented: Lead, Qualified, Proposal, Won, Lost.
  // Won deals have expectedCloseDate in October 2026.
  const deals = await Deal.insertMany([
    // 1. Enterprise Platform — 850000, Lead, Arjun Reddy
    {
      title: 'Enterprise Platform',
      value: 850000,
      stage: 'Lead',
      expectedCloseDate: new Date('2026-11-15T00:00:00.000Z'),
      customer: arjun._id,
      user: userId,
    },
    // 2. Cloud Migration — 1200000, Lead, Rahul Mehta
    {
      title: 'Cloud Migration',
      value: 1200000,
      stage: 'Lead',
      expectedCloseDate: new Date('2026-11-30T00:00:00.000Z'),
      customer: rahul._id,
      user: userId,
    },
    // 3. CRM Integration — 650000, Qualified, Priya Sharma
    {
      title: 'CRM Integration',
      value: 650000,
      stage: 'Qualified',
      expectedCloseDate: new Date('2026-11-10T00:00:00.000Z'),
      customer: priya._id,
      user: userId,
    },
    // 4. Mobile App Development — 900000, Qualified, Ananya Rao
    {
      title: 'Mobile App Development',
      value: 900000,
      stage: 'Qualified',
      expectedCloseDate: new Date('2026-12-05T00:00:00.000Z'),
      customer: ananya._id,
      user: userId,
    },
    // 5. Analytics Platform — 1500000, Proposal, Sneha Patel
    {
      title: 'Analytics Platform',
      value: 1500000,
      stage: 'Proposal',
      expectedCloseDate: new Date('2026-10-25T00:00:00.000Z'),
      customer: sneha._id,
      user: userId,
    },
    // 6. Security Upgrade — 750000, Proposal, Vikram Singh
    {
      title: 'Security Upgrade',
      value: 750000,
      stage: 'Proposal',
      expectedCloseDate: new Date('2026-11-05T00:00:00.000Z'),
      customer: vikram._id,
      user: userId,
    },
    // 7. Website Revamp — 500000, Won, Arjun Reddy (Won this month: October 2026)
    {
      title: 'Website Revamp',
      value: 500000,
      stage: 'Won',
      expectedCloseDate: new Date('2026-10-15T00:00:00.000Z'),
      customer: arjun._id,
      user: userId,
    },
    // 8. Data Migration — 450000, Won, Priya Sharma (Won this month: October 2026)
    {
      title: 'Data Migration',
      value: 450000,
      stage: 'Won',
      expectedCloseDate: new Date('2026-10-20T00:00:00.000Z'),
      customer: priya._id,
      user: userId,
    },
    // 9. Legacy Upgrade — 300000, Lost, Kiran Kumar
    {
      title: 'Legacy Upgrade',
      value: 300000,
      stage: 'Lost',
      expectedCloseDate: new Date('2026-09-20T00:00:00.000Z'),
      customer: kiran._id,
      user: userId,
    },
    // 10. Support Contract — 250000, Lost, Neha Verma
    {
      title: 'Support Contract',
      value: 250000,
      stage: 'Lost',
      expectedCloseDate: new Date('2026-09-15T00:00:00.000Z'),
      customer: neha._id,
      user: userId,
    },
  ])

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

  console.log(`✅  Created ${deals.length} deals`)

  // ── 5. Tasks — 12 required ────────────────────────────────────────────────
  // Date boundaries relative to Oct 7, 2026:
  // - 3 Due today: Oct 7 2026 (Incomplete)
  // - 5 Upcoming: Oct 9, 10, 12, 14, 16 2026 (Incomplete)
  // - 3 Overdue: Oct 4, Oct 2, Sep 29 2026 (Incomplete)
  // - 1 Completed: Sep 30 2026 (Completed = true)
  const tasks = await Task.insertMany([
    // 1. Send proposal — Oct 7 2026, High, Incomplete, Sneha Patel, Analytics Platform
    {
      title: 'Send proposal',
      dueDate: new Date('2026-10-07T12:00:00.000Z'),
      priority: 'High',
      completed: false,
      customer: sneha._id,
      deal: dealAnalytics._id,
      user: userId,
    },
    // 2. Follow up with client — Oct 7 2026, Medium, Incomplete, Arjun Reddy, Enterprise Platform
    {
      title: 'Follow up with client',
      dueDate: new Date('2026-10-07T12:00:00.000Z'),
      priority: 'Medium',
      completed: false,
      customer: arjun._id,
      deal: dealEnterprise._id,
      user: userId,
    },
    // 3. Review contract — Oct 7 2026, High, Incomplete, Priya Sharma, CRM Integration
    {
      title: 'Review contract',
      dueDate: new Date('2026-10-07T12:00:00.000Z'),
      priority: 'High',
      completed: false,
      customer: priya._id,
      deal: dealCrm._id,
      user: userId,
    },
    // 4. Prepare presentation — Oct 9 2026, Medium, Incomplete, Rahul Mehta, Cloud Migration
    {
      title: 'Prepare presentation',
      dueDate: new Date('2026-10-09T12:00:00.000Z'),
      priority: 'Medium',
      completed: false,
      customer: rahul._id,
      deal: dealCloud._id,
      user: userId,
    },
    // 5. Schedule technical discussion — Oct 10 2026, High, Incomplete, Vikram Singh, Security Upgrade
    {
      title: 'Schedule technical discussion',
      dueDate: new Date('2026-10-10T12:00:00.000Z'),
      priority: 'High',
      completed: false,
      customer: vikram._id,
      deal: dealSecurity._id,
      user: userId,
    },
    // 6. Send project estimate — Oct 12 2026, Low, Incomplete, Ananya Rao, Mobile App Development
    {
      title: 'Send project estimate',
      dueDate: new Date('2026-10-12T12:00:00.000Z'),
      priority: 'Low',
      completed: false,
      customer: ananya._id,
      deal: dealMobile._id,
      user: userId,
    },
    // 7. Update requirements — Oct 14 2026, Medium, Incomplete, Arjun Reddy, Enterprise Platform
    {
      title: 'Update requirements',
      dueDate: new Date('2026-10-14T12:00:00.000Z'),
      priority: 'Medium',
      completed: false,
      customer: arjun._id,
      deal: dealEnterprise._id,
      user: userId,
    },
    // 8. Prepare onboarding — Oct 16 2026, High, Incomplete, Priya Sharma, Data Migration
    {
      title: 'Prepare onboarding',
      dueDate: new Date('2026-10-16T12:00:00.000Z'),
      priority: 'High',
      completed: false,
      customer: priya._id,
      deal: dealDataMigration._id,
      user: userId,
    },
    // 9. Follow up on payment — Oct 4 2026, High, Incomplete (Overdue), Sneha Patel, Analytics Platform
    {
      title: 'Follow up on payment',
      dueDate: new Date('2026-10-04T12:00:00.000Z'),
      priority: 'High',
      completed: false,
      customer: sneha._id,
      deal: dealAnalytics._id,
      user: userId,
    },
    // 10. Send revised quotation — Oct 2 2026, Medium, Incomplete (Overdue), Rahul Mehta, Cloud Migration
    {
      title: 'Send revised quotation',
      dueDate: new Date('2026-10-02T12:00:00.000Z'),
      priority: 'Medium',
      completed: false,
      customer: rahul._id,
      deal: dealCloud._id,
      user: userId,
    },
    // 11. Review old proposal — Sep 29 2026, Low, Incomplete (Overdue), Kiran Kumar, Legacy Upgrade
    {
      title: 'Review old proposal',
      dueDate: new Date('2026-09-29T12:00:00.000Z'),
      priority: 'Low',
      completed: false,
      customer: kiran._id,
      deal: dealLegacy._id,
      user: userId,
    },
    // 12. Complete onboarding — Sep 30 2026, High, Completed, Priya Sharma, Data Migration
    {
      title: 'Complete onboarding',
      dueDate: new Date('2026-09-30T12:00:00.000Z'),
      priority: 'High',
      completed: true,
      customer: priya._id,
      deal: dealDataMigration._id,
      user: userId,
    },
  ])

  console.log(`✅  Created ${tasks.length} tasks`)
  console.log('\n🎉  Demo data seeded successfully!')
  console.log(`    Customers: ${customers.length}`)
  console.log(`    Deals:     ${deals.length}`)
  console.log(`    Tasks:     ${tasks.length}`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('❌  Seed failed:', err)
  mongoose.disconnect().finally(() => process.exit(1))
})
