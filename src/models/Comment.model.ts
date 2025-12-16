import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  content: string;
  taskId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  isEdited: boolean;
  editedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const CommentSchema = new Schema(
  {
    content: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);
