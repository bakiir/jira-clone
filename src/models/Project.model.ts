import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  key: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  taskCounter: number; // ← Добавили это поле
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    taskCounter: { type: Number, default: 0 }, // ← Добавили это поле
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", ProjectSchema);
