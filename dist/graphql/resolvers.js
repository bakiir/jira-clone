"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_1 = require("graphql");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const User_model_1 = require("../models/User.model");
const Project_model_1 = require("../models/Project.model");
const Task_model_1 = require("../models/Task.model");
const Comment_model_1 = require("../models/Comment.model");
const bcrypt_1 = require("../utils/bcrypt");
const jwt_1 = require("../utils/jwt");
const pubsub = new graphql_subscriptions_1.PubSub();
const TASK_UPDATED = "TASK_UPDATED";
const COMMENT_ADDED = "COMMENT_ADDED";
exports.resolvers = {
    Query: {
        me: async (_, __, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            return User_model_1.User.findById(userId);
        },
        users: async () => {
            return User_model_1.User.find();
        },
        projects: async (_, __, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            return Project_model_1.Project.find({
                $or: [{ ownerId: userId }, { memberIds: userId }],
            });
        },
        project: async (_, { id }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const project = await Project_model_1.Project.findById(id);
            if (!project)
                throw new graphql_1.GraphQLError("Project not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            const isMember = project.memberIds.some((memberId) => memberId.toString() === userId);
            const isOwner = project.ownerId.toString() === userId;
            if (!isMember && !isOwner)
                throw new graphql_1.GraphQLError("Access denied", {
                    extensions: { code: "FORBIDDEN" },
                });
            return project;
        },
        tasks: async (_, { projectId }) => {
            return Task_model_1.Task.find({ projectId }).sort({ status: 1, position: 1 });
        },
        task: async (_, { id }) => {
            const task = await Task_model_1.Task.findById(id);
            if (!task)
                throw new graphql_1.GraphQLError("Task not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            return task;
        },
        myTasks: async (_, __, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            return Task_model_1.Task.find({ assigneeId: userId }).sort({ createdAt: -1 });
        },
        comments: async (_, { taskId }) => {
            return Comment_model_1.Comment.find({ taskId }).sort({ createdAt: 1 });
        },
    },
    Mutation: {
        register: async (_, { email, password, name }) => {
            const existingUser = await User_model_1.User.findOne({ email });
            if (existingUser)
                throw new graphql_1.GraphQLError("Email already exists", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
            const user = await User_model_1.User.create({ email, password: hashedPassword, name });
            const token = (0, jwt_1.generateToken)(user.id);
            return { token, user };
        },
        login: async (_, { email, password }) => {
            const user = await User_model_1.User.findOne({ email }).select("+password");
            if (!user)
                throw new graphql_1.GraphQLError("Invalid credentials", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            const valid = await (0, bcrypt_1.comparePassword)(password, user.password);
            if (!valid)
                throw new graphql_1.GraphQLError("Invalid credentials", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            const token = (0, jwt_1.generateToken)(user.id);
            return { token, user };
        },
        createProject: async (_, { name, key, description }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const existingProject = await Project_model_1.Project.findOne({ key });
            if (existingProject)
                throw new graphql_1.GraphQLError("Project key already exists", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            return Project_model_1.Project.create({
                name,
                key: key.toUpperCase(),
                description,
                ownerId: userId,
                memberIds: [userId],
            });
        },
        updateProject: async (_, { id, name, description }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const project = await Project_model_1.Project.findById(id);
            if (!project)
                throw new graphql_1.GraphQLError("Project not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            if (project.ownerId.toString() !== userId)
                throw new graphql_1.GraphQLError("Only owner can update project", {
                    extensions: { code: "FORBIDDEN" },
                });
            if (name)
                project.name = name;
            if (description !== undefined)
                project.description = description;
            await project.save();
            return project;
        },
        deleteProject: async (_, { id }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const project = await Project_model_1.Project.findById(id);
            if (!project)
                throw new graphql_1.GraphQLError("Project not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            if (project.ownerId.toString() !== userId)
                throw new graphql_1.GraphQLError("Only owner can delete project", {
                    extensions: { code: "FORBIDDEN" },
                });
            const tasks = await Task_model_1.Task.find({ projectId: id });
            const taskIds = tasks.map((task) => task._id);
            await Comment_model_1.Comment.deleteMany({ taskId: { $in: taskIds } });
            await Task_model_1.Task.deleteMany({ projectId: id });
            await Project_model_1.Project.findByIdAndDelete(id);
            return true;
        },
        addProjectMember: async (_, { projectId, userId: newUserId }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const project = await Project_model_1.Project.findById(projectId);
            if (!project)
                throw new graphql_1.GraphQLError("Project not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            const isOwner = project.ownerId.toString() === userId;
            const isMember = project.memberIds.some((id) => id.toString() === userId);
            if (!isOwner && !isMember)
                throw new graphql_1.GraphQLError("Access denied", {
                    extensions: { code: "FORBIDDEN" },
                });
            const newUser = await User_model_1.User.findById(newUserId);
            if (!newUser)
                throw new graphql_1.GraphQLError("User not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            const alreadyMember = project.memberIds.some((id) => id.toString() === newUserId);
            if (alreadyMember)
                throw new graphql_1.GraphQLError("User is already a member", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            project.memberIds.push(newUser._id);
            await project.save();
            return project;
        },
        removeProjectMember: async (_, { projectId, userId: removeUserId }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const project = await Project_model_1.Project.findById(projectId);
            if (!project)
                throw new graphql_1.GraphQLError("Project not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            if (project.ownerId.toString() !== userId)
                throw new graphql_1.GraphQLError("Only owner can remove members", {
                    extensions: { code: "FORBIDDEN" },
                });
            if (project.ownerId.toString() === removeUserId)
                throw new graphql_1.GraphQLError("Cannot remove project owner", {
                    extensions: { code: "BAD_USER_INPUT" },
                });
            project.memberIds = project.memberIds.filter((id) => id.toString() !== removeUserId);
            await project.save();
            return project;
        },
        createTask: async (_, { title, projectId, description, priority, assigneeId }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const project = await Project_model_1.Project.findById(projectId);
            if (!project)
                throw new graphql_1.GraphQLError("Project not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            const taskNumber = project.taskCounter + 1;
            project.taskCounter = taskNumber;
            await project.save();
            const task = await Task_model_1.Task.create({
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
        updateTask: async (_, { id, title, description, status, priority, assigneeId }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const task = await Task_model_1.Task.findById(id);
            if (!task)
                throw new graphql_1.GraphQLError("Task not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            if (title)
                task.title = title;
            if (description !== undefined)
                task.description = description;
            if (status)
                task.status = status;
            if (priority)
                task.priority = priority;
            if (assigneeId !== undefined)
                task.assigneeId = assigneeId;
            await task.save();
            pubsub.publish(TASK_UPDATED, {
                taskUpdated: { action: "UPDATED", task },
                projectId: task.projectId.toString(),
            });
            return task;
        },
        deleteTask: async (_, { id }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const task = await Task_model_1.Task.findById(id);
            if (!task)
                throw new graphql_1.GraphQLError("Task not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            await Comment_model_1.Comment.deleteMany({ taskId: id });
            await Task_model_1.Task.findByIdAndDelete(id);
            pubsub.publish(TASK_UPDATED, {
                taskUpdated: { action: "DELETED", task },
                projectId: task.projectId.toString(),
            });
            return true;
        },
        moveTask: async (_, { id, status, position }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const task = await Task_model_1.Task.findById(id);
            if (!task)
                throw new graphql_1.GraphQLError("Task not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            const oldStatus = task.status;
            task.status = status;
            task.position = position;
            // Обновляем позиции других задач в новой колонке
            if (oldStatus !== status) {
                await Task_model_1.Task.updateMany({
                    projectId: task.projectId,
                    status,
                    _id: { $ne: id },
                    position: { $gte: position },
                }, { $inc: { position: 1 } });
            }
            await task.save();
            pubsub.publish(TASK_UPDATED, {
                taskUpdated: { action: "MOVED", task },
                projectId: task.projectId.toString(),
            });
            return task;
        },
        createComment: async (_, { content, taskId }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const task = await Task_model_1.Task.findById(taskId);
            if (!task)
                throw new graphql_1.GraphQLError("Task not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            const comment = await Comment_model_1.Comment.create({
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
        updateComment: async (_, { id, content }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const comment = await Comment_model_1.Comment.findById(id);
            if (!comment)
                throw new graphql_1.GraphQLError("Comment not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            if (comment.authorId.toString() !== userId)
                throw new graphql_1.GraphQLError("Only author can update comment", {
                    extensions: { code: "FORBIDDEN" },
                });
            comment.content = content;
            comment.isEdited = true;
            comment.editedAt = new Date();
            await comment.save();
            return comment;
        },
        deleteComment: async (_, { id }, { userId }) => {
            if (!userId)
                throw new graphql_1.GraphQLError("Not authenticated", {
                    extensions: { code: "UNAUTHENTICATED" },
                });
            const comment = await Comment_model_1.Comment.findById(id);
            if (!comment)
                throw new graphql_1.GraphQLError("Comment not found", {
                    extensions: { code: "NOT_FOUND" },
                });
            if (comment.authorId.toString() !== userId)
                throw new graphql_1.GraphQLError("Only author can delete comment", {
                    extensions: { code: "FORBIDDEN" },
                });
            await Comment_model_1.Comment.findByIdAndDelete(id);
            return true;
        },
    },
    Subscription: {
        taskUpdated: {
            subscribe: (_, { projectId }) => {
                return pubsub.asyncIterableIterator([TASK_UPDATED]);
            },
            resolve: (payload, { projectId }) => {
                if (payload.projectId === projectId) {
                    return payload.taskUpdated;
                }
                return null;
            },
        },
        commentAdded: {
            subscribe: (_, { taskId }) => {
                return pubsub.asyncIterableIterator([COMMENT_ADDED]);
            },
            resolve: (payload, { taskId }) => {
                if (payload.taskId === taskId) {
                    return payload.commentAdded;
                }
                return null;
            },
        },
    },
    Project: {
        owner: async (project) => User_model_1.User.findById(project.ownerId),
        members: async (project) => User_model_1.User.find({ _id: { $in: project.memberIds } }),
    },
    Task: {
        project: async (task) => Project_model_1.Project.findById(task.projectId),
        assignee: async (task) => task.assigneeId ? User_model_1.User.findById(task.assigneeId) : null,
        reporter: async (task) => User_model_1.User.findById(task.reporterId),
        taskKey: async (task) => {
            const project = await Project_model_1.Project.findById(task.projectId);
            return `${project?.key}-${task.taskNumber}`;
        },
    },
    Comment: {
        task: async (comment) => Task_model_1.Task.findById(comment.taskId),
        author: async (comment) => User_model_1.User.findById(comment.authorId),
    },
};
