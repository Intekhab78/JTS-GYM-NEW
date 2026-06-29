import mongoose from 'mongoose';

const cmsBlockSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null }, // Null means it applies to all locations of this brand
    type: { 
      type: String, 
      required: true,
      enum: ['IntroSection', 'ProgramsSection', 'PricingSection', 'CTASection', 'HeroSlider', 'VideoBlock', 'ImageBanner', 'TextSection', 'Gallery'] 
    },
    title: { type: String, required: true },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Indexes for faster public querying
cmsBlockSchema.index({ brandId: 1, locationId: 1, isActive: 1, sortOrder: 1 });

const CMSBlock = mongoose.model('CMSBlock', cmsBlockSchema);
export default CMSBlock;
