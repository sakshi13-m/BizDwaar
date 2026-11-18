/**
 * GH-03 acceptance test — run once, then delete the test record.
 * Usage: node server/scripts/testDb.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../db.js'
import Business from '../models/Business.js'
import Enquiry from '../models/Enquiry.js'

async function run() {
  await connectDB()

  // Clean up any leftover test record
  await Business.deleteOne({ slug: 'gh03-test-business' })

  // Create a test business
  const biz = await Business.create({
    name: 'GH-03 Test Business',
    slug: 'gh03-test-business',
    location: 'Indore',
    ownerInput: { description: 'Test description for GH-03 acceptance check.' }
  })
  console.log('Created business:', biz._id.toString(), biz.name)

  // Create a test enquiry linked to it
  const enq = await Enquiry.create({
    businessId: biz._id,
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    message: 'Is this pickle available?'
  })
  console.log('Created enquiry:', enq._id.toString(), '| status:', enq.notificationStatus)

  // Read back
  const found = await Business.findOne({ slug: 'gh03-test-business' })
  console.log('Read back business:', found.name, '| status:', found.status)

  // Clean up
  await Business.deleteOne({ _id: biz._id })
  await Enquiry.deleteOne({ _id: enq._id })
  console.log('Cleaned up test records.')

  await mongoose.disconnect()
  console.log('GH-03 DB test PASSED')
}

run().catch((err) => {
  console.error('GH-03 DB test FAILED:', err.message)
  process.exit(1)
})
