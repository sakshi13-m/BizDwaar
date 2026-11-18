import mongoose from 'mongoose'

// --- Sub-schemas ---

const catalogueItemSchema = new mongoose.Schema({
  name:        { type: String, default: null },
  description: { type: String, default: null },
  price:       { type: String, default: null },  // string to allow "₹120" or null
  unitOrSize:  { type: String, default: null },
  attributes:  { type: [String], default: [] },
  publicVisible: { type: Boolean, default: true }
}, { _id: true })

const missingQuestionSchema = new mongoose.Schema({
  field:    { type: String, required: true },
  question: { type: String, required: true }
}, { _id: false })

// --- Main schema ---

const businessSchema = new mongoose.Schema({
  // Identity
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { type: String, default: null },
  location: { type: String, default: null },

  // Raw owner input — private; never returned by public APIs
  ownerInput: {
    description: { type: String, default: null },
    rawProductFacts: { type: String, default: null }
  },

  // AI draft — private and editable
  aiDraft: {
    businessSummary:  { type: String, default: null },
    suggestedCategory: { type: String, default: null },
    catalogueDrafts:  { type: [catalogueItemSchema], default: [] },
    missingQuestions: { type: [missingQuestionSchema], default: [] },
    analysedAt:       { type: Date, default: null }
  },

  // Owner-approved profile — what may be published
  approvedProfile: {
    businessName:  { type: String, default: null },
    description:   { type: String, default: null },
    category:      { type: String, default: null },
    location:      { type: String, default: null },
    contactEmail:  { type: String, default: null },
    contactPhone:  { type: String, default: null }
  },

  // Owner-approved catalogue
  approvedCatalogue: { type: [catalogueItemSchema], default: [] },

  // Publication
  status:      { type: String, enum: ['draft', 'published'], default: 'draft' },
  publishedAt: { type: Date, default: null }

}, { timestamps: true })

// Slug index already unique; add index on status for public queries
businessSchema.index({ status: 1, slug: 1 })

export default mongoose.model('Business', businessSchema)
