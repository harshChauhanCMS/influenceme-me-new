import {model, Model, Schema} from "mongoose";

// Interface for the address sub-document
interface IGenre {
    name?: string;
    icon?: string;
    index?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGenreModel extends Model<IGenre> {
    // Add static methods here if needed in the future
}

const userSchema = new Schema<IGenre, IGenreModel>({
    name: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: false
    },
    index: Number,
    createdAt: Date,
    updatedAt: Date,
}, {timestamps: true});


const Genre = model<IGenre, IGenreModel>('genre', userSchema);

export default Genre;