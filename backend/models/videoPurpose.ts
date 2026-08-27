import { Schema, model, Model, Document } from 'mongoose';

export interface IVideoPurpose extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const videoPurposeSchema = new Schema<IVideoPurpose>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active purposes
videoPurposeSchema.index({ isActive: 1, name: 1 });

const VideoPurpose: Model<IVideoPurpose> = model<IVideoPurpose>('VideoPurpose', videoPurposeSchema);

export default VideoPurpose;

