const bcrypt = require('bcryptjs');
const User = require('../models/User');

const DEMO_PASSWORD = 'pass1234';

const DEFAULT_USERS = [
  // 5 Victims
  { name: 'Demo Victim 1', email: 'victim1@test.com', password: DEMO_PASSWORD, role: 'victim' },
  { name: 'Demo Victim 2', email: 'victim2@test.com', password: DEMO_PASSWORD, role: 'victim' },
  { name: 'Demo Victim 3', email: 'victim3@test.com', password: DEMO_PASSWORD, role: 'victim' },
  { name: 'Demo Victim 4', email: 'victim4@test.com', password: DEMO_PASSWORD, role: 'victim' },
  { name: 'Demo Victim 5', email: 'victim5@test.com', password: DEMO_PASSWORD, role: 'victim' },
  // 5 Volunteers
  { name: 'Demo Volunteer 1', email: 'volunteer1@test.com', password: DEMO_PASSWORD, role: 'volunteer' },
  { name: 'Demo Volunteer 2', email: 'volunteer2@test.com', password: DEMO_PASSWORD, role: 'volunteer' },
  { name: 'Demo Volunteer 3', email: 'volunteer3@test.com', password: DEMO_PASSWORD, role: 'volunteer' },
  { name: 'Demo Volunteer 4', email: 'volunteer4@test.com', password: DEMO_PASSWORD, role: 'volunteer' },
  { name: 'Demo Volunteer 5', email: 'volunteer5@test.com', password: DEMO_PASSWORD, role: 'volunteer' },
  // 2 Admins
  { name: 'Demo Admin 1', email: 'admin1@test.com', password: DEMO_PASSWORD, role: 'admin' },
  { name: 'Demo Admin 2', email: 'admin2@test.com', password: DEMO_PASSWORD, role: 'admin' }
];

async function cleanupStaleIndexes() {
  try {
    const collection = User.collection;
    const indexes = await collection.indexes();
    if (indexes.some((index) => index.name === 'username_1')) {
      await collection.dropIndex('username_1');
      console.log('🧹 Dropped stale username_1 index from users collection');
    }
  } catch (error) {
    console.warn('Index cleanup skipped:', error.message);
  }
}

async function seedDefaultUsers() {
  await cleanupStaleIndexes();

  for (const account of DEFAULT_USERS) {
    try {
      const existing = await User.findOne({ email: account.email });

      if (existing) {
        if (!existing.passwordHash) {
          existing.passwordHash = await bcrypt.hash(account.password, 10);
          await existing.save();
          console.log(`🔑 Password set for existing user: ${account.email}`);
        }
        continue;
      }

      const passwordHash = await bcrypt.hash(account.password, 10);
      await User.create({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role
      });
      console.log(`✅ Seeded demo user: ${account.email} (${account.role})`);
    } catch (error) {
      console.warn(`⚠️ Could not seed ${account.email}:`, error.message);
    }
  }
}

module.exports = seedDefaultUsers;
