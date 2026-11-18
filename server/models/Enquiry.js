import mongoose from 'mongoose'

const enquirySchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // Customer details
  customerName:  { type: String, required: true, trim: true },
  customerEmail: { type: String, default: null, trim: true },
  customerPhone: { type: String, default: null, trim: true },
  message:       { type: String, required: true, trim: true },

  // Email notification tracking
  notificationStatus:     { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  notificationAttemptedAt: { type: Date, default: null }

}, { timestamps: true })

export default mongoose.model('Enquiry', enquirySchema)
