import { Schema, model, Model, Document, Types } from 'mongoose';

export interface IShowcaseVideo extends Document {
  title: string;
  description: string;
  youtubeUrl: string; // Changed from videoUrl to youtubeUrl
  thumbnailUrl?: string;
  videoPurpose: Types.ObjectId; // Reference to VideoPurpose
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const showcaseVideoSchema = new Schema<IShowcaseVideo>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    youtubeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
    },
    videoPurpose: {
      type: Schema.Types.ObjectId,
      ref: 'VideoPurpose',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
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

// Index for ordering and filtering by purpose
showcaseVideoSchema.index({ order: 1, isActive: 1 });
showcaseVideoSchema.index({ videoPurpose: 1, isActive: 1 });

const ShowcaseVideo: Model<IShowcaseVideo> = model<IShowcaseVideo>('ShowcaseVideo', showcaseVideoSchema);

export default ShowcaseVideo;

