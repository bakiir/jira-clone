import { GraphQLError } from "graphql";
import { PubSub } from "graphql-subscriptions";
import { User } from "../models/User.model";
import { Project } from "../models/Project.model";
import { Task } from "../models/Task.model";
import { Comment } from "../models/Comment.model";
import { hashPassword, comparePassword } from "../utils/bcrypt";
import { generateToken } from "../utils/jwt";
import { Context } from "./context";

const pubsub = new PubSub();

const TASK_UPDATED = "TASK_UPDATED";
const COMMENT_ADDED = "COMMENT_ADDED";

export const resolvers = {
  Query: {
    me: async (_: any, __: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      return User.findById(userId);
    },

    users: async () => {
      return User.find();
    },

    projects: async (_: any, __: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      return Project.find({
        $or: [{ ownerId: userId }, { memberIds: userId }],
      });
    },

    project: async (_: any, { id }: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const project = await Project.findById(id);
      if (!project)
        throw new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        });

      const isMember = project.memberIds.some(
        (memberId) => memberId.toString() === userId
      );
      const isOwner = project.ownerId.toString() === userId;

      if (!isMember && !isOwner)
        throw new GraphQLError("Access denied", {
          extensions: { code: "FORBIDDEN" },
        });

      return project;
    },

    tasks: async (_: any, { projectId }: any) => {
      return Task.find({ projectId }).sort({ status: 1, position: 1 });
    },

    task: async (_: any, { id }: any) => {
      const task = await Task.findById(id);
      if (!task)
        throw new GraphQLError("Task not found", {
          extensions: { code: "NOT_FOUND" },
        });
      return task;
    },

    myTasks: async (_: any, __: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      return Task.find({ assigneeId: userId }).sort({ createdAt: -1 });
    },

    comments: async (_: any, { taskId }: any) => {
      return Comment.find({ taskId }).sort({ createdAt: 1 });
    },
  },

  Mutation: {
    register: async (_: any, { email, password, name }: any) => {
      const existingUser = await User.findOne({ email });
      if (existingUser)
        throw new GraphQLError("Email already exists", {
          extensions: { code: "BAD_USER_INPUT" },
        });

      const hashedPassword = await hashPassword(password);
      const user = await User.create({ email, password: hashedPassword, name });
      const token = generateToken(user.id);
      return { token, user };
    },

    login: async (_: any, { email, password }: any) => {
      const user = await User.findOne({ email }).select("+password");
      if (!user)
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "BAD_USER_INPUT" },
        });

      const valid = await comparePassword(password, user.password);
      if (!valid)
        throw new GraphQLError("Invalid credentials", {
          extensions: { code: "BAD_USER_INPUT" },
        });

      const token = generateToken(user.id);
      return { token, user };
    },

    createProject: async (
      _: any,
      { name, key, description }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const existingProject = await Project.findOne({ key });
      if (existingProject)
        throw new GraphQLError("Project key already exists", {
          extensions: { code: "BAD_USER_INPUT" },
        });

      return Project.create({
        name,
        key: key.toUpperCase(),
        description,
        ownerId: userId,
        memberIds: [userId],
      });
    },

    updateProject: async (
      _: any,
      { id, name, description }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const project = await Project.findById(id);
      if (!project)
        throw new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        });
      if (project.ownerId.toString() !== userId)
        throw new GraphQLError("Only owner can update project", {
          extensions: { code: "FORBIDDEN" },
        });

      if (name) project.name = name;
      if (description !== undefined) project.description = description;

      await project.save();
      return project;
    },

    deleteProject: async (_: any, { id }: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const project = await Project.findById(id);
      if (!project)
        throw new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        });
      if (project.ownerId.toString() !== userId)
        throw new GraphQLError("Only owner can delete project", {
          extensions: { code: "FORBIDDEN" },
        });

      const tasks = await Task.find({ projectId: id });
      const taskIds = tasks.map((task) => task._id);
      await Comment.deleteMany({ taskId: { $in: taskIds } });
      await Task.deleteMany({ projectId: id });
      await Project.findByIdAndDelete(id);

      return true;
    },

    addProjectMember: async (
      _: any,
      { projectId, userId: newUserId }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const project = await Project.findById(projectId);
      if (!project)
        throw new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        });

      const isOwner = project.ownerId.toString() === userId;
      const isMember = project.memberIds.some((id) => id.toString() === userId);

      if (!isOwner && !isMember)
        throw new GraphQLError("Access denied", {
          extensions: { code: "FORBIDDEN" },
        });

      const newUser = await User.findById(newUserId);
      if (!newUser)
        throw new GraphQLError("User not found", {
          extensions: { code: "NOT_FOUND" },
        });

      const alreadyMember = project.memberIds.some(
        (id) => id.toString() === newUserId
      );
      if (alreadyMember)
        throw new GraphQLError("User is already a member", {
          extensions: { code: "BAD_USER_INPUT" },
        });

      project.memberIds.push(newUser._id);
      await project.save();

      return project;
    },

    removeProjectMember: async (
      _: any,
      { projectId, userId: removeUserId }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const project = await Project.findById(projectId);
      if (!project)
        throw new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        });

      if (project.ownerId.toString() !== userId)
        throw new GraphQLError("Only owner can remove members", {
          extensions: { code: "FORBIDDEN" },
        });

      if (project.ownerId.toString() === removeUserId)
        throw new GraphQLError("Cannot remove project owner", {
          extensions: { code: "BAD_USER_INPUT" },
        });

      project.memberIds = project.memberIds.filter(
        (id) => id.toString() !== removeUserId
      );
      await project.save();

      return project;
    },

    createTask: async (
      _: any,
      { title, projectId, description, priority, assigneeId }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const project = await Project.findById(projectId);
      if (!project)
        throw new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        });

      const taskNumber = project.taskCounter + 1;
      project.taskCounter = taskNumber;
      await project.save();

      const task = await Task.create({
        title,
        description,
        projectId,
        priority: priority || "MEDIUM",
        reporterId: userId,
        assigneeId,
        taskNumber,
      });

      pubsub.publish(TASK_UPDATED, {
        taskUpdated: { action: "CREATED", task },
        projectId,
      });

      return task;
    },

    updateTask: async (
      _: any,
      { id, title, description, status, priority, assigneeId }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const task = await Task.findById(id);
      if (!task)
        throw new GraphQLError("Task not found", {
          extensions: { code: "NOT_FOUND" },
        });

      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (assigneeId !== undefined) task.assigneeId = assigneeId;

      await task.save();

      pubsub.publish(TASK_UPDATED, {
        taskUpdated: { action: "UPDATED", task },
        projectId: task.projectId.toString(),
      });

      return task;
    },

    deleteTask: async (_: any, { id }: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const task = await Task.findById(id);
      if (!task)
        throw new GraphQLError("Task not found", {
          extensions: { code: "NOT_FOUND" },
        });

      await Comment.deleteMany({ taskId: id });
      await Task.findByIdAndDelete(id);

      pubsub.publish(TASK_UPDATED, {
        taskUpdated: { action: "DELETED", task },
        projectId: task.projectId.toString(),
      });

      return true;
    },

    moveTask: async (
      _: any,
      { id, status, position }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const task = await Task.findById(id);
      if (!task)
        throw new GraphQLError("Task not found", {
          extensions: { code: "NOT_FOUND" },
        });

      const oldStatus = task.status;
      task.status = status;
      task.position = position;

      // Обновляем позиции других задач в новой колонке
      if (oldStatus !== status) {
        await Task.updateMany(
          {
            projectId: task.projectId,
            status,
            _id: { $ne: id },
            position: { $gte: position },
          },
          { $inc: { position: 1 } }
        );
      }

      await task.save();

      pubsub.publish(TASK_UPDATED, {
        taskUpdated: { action: "MOVED", task },
        projectId: task.projectId.toString(),
      });

      return task;
    },

    createComment: async (
      _: any,
      { content, taskId }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const task = await Task.findById(taskId);
      if (!task)
        throw new GraphQLError("Task not found", {
          extensions: { code: "NOT_FOUND" },
        });

      const comment = await Comment.create({
        content,
        taskId,
        authorId: userId,
      });

      pubsub.publish(COMMENT_ADDED, {
        commentAdded: comment,
        taskId,
      });

      return comment;
    },

    updateComment: async (
      _: any,
      { id, content }: any,
      { userId }: Context
    ) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const comment = await Comment.findById(id);
      if (!comment)
        throw new GraphQLError("Comment not found", {
          extensions: { code: "NOT_FOUND" },
        });

      if (comment.authorId.toString() !== userId)
        throw new GraphQLError("Only author can update comment", {
          extensions: { code: "FORBIDDEN" },
        });

      comment.content = content;
      comment.isEdited = true;
      comment.editedAt = new Date();
      await comment.save();

      return comment;
    },

    deleteComment: async (_: any, { id }: any, { userId }: Context) => {
      if (!userId)
        throw new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        });

      const comment = await Comment.findById(id);
      if (!comment)
        throw new GraphQLError("Comment not found", {
          extensions: { code: "NOT_FOUND" },
        });

      if (comment.authorId.toString() !== userId)
        throw new GraphQLError("Only author can delete comment", {
          extensions: { code: "FORBIDDEN" },
        });

      await Comment.findByIdAndDelete(id);
      return true;
    },
  },

  Subscription: {
    taskUpdated: {
      subscribe: (_: any, { projectId }: any) => {
        return pubsub.asyncIterableIterator([TASK_UPDATED]);
      },
      resolve: (payload: any, { projectId }: any) => {
        if (payload.projectId === projectId) {
          return payload.taskUpdated;
        }
        return null;
      },
    },

    commentAdded: {
      subscribe: (_: any, { taskId }: any) => {
        return pubsub.asyncIterableIterator([COMMENT_ADDED]);
      },
      resolve: (payload: any, { taskId }: any) => {
        if (payload.taskId === taskId) {
          return payload.commentAdded;
        }
        return null;
      },
    },
  },

  Project: {
    owner: async (project: any) => User.findById(project.ownerId),
    members: async (project: any) =>
      User.find({ _id: { $in: project.memberIds } }),
  },

  Task: {
    project: async (task: any) => Project.findById(task.projectId),
    assignee: async (task: any) =>
      task.assigneeId ? User.findById(task.assigneeId) : null,
    reporter: async (task: any) => User.findById(task.reporterId),
    taskKey: async (task: any) => {
      const project = await Project.findById(task.projectId);
      return `${project?.key}-${task.taskNumber}`;
    },
  },

  Comment: {
    task: async (comment: any) => Task.findById(comment.taskId),
    author: async (comment: any) => User.findById(comment.authorId),
  },
};
