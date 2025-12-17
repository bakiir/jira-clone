import mongoose from "mongoose";
import { connectDB } from "./config/db";
import { User } from "./models/User.model";
import { Project } from "./models/Project.model";
import { Task } from "./models/Task.model";
import { Comment } from "./models/Comment.model";
import { hashPassword } from "./utils/bcrypt";

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    console.log("Existing data cleared.");

    console.log("Seeding users...");
    const hashedPassword = await hashPassword("password123");
    const users = await User.insertMany([
      {
        name: "Admin User",
        email: "admin@example.com",
        password: hashedPassword,
        role: "ADMIN",
      },
      {
        name: "Member User",
        email: "member@example.com",
        password: hashedPassword,
        role: "MEMBER",
      },
    ]);
    const adminUser = users[0];
    const memberUser = users[1];
    console.log("Users seeded.");

    console.log("Seeding projects...");
    const projects = await Project.insertMany([
      {
        name: "Jira Clone Project",
        key: "JCP",
        description: "A clone of Jira for learning purposes.",
        ownerId: adminUser._id,
        memberIds: [adminUser._id, memberUser._id],
        taskCounter: 0,
      },
    ]);
    const jiraCloneProject = projects[0];
    console.log("Projects seeded.");

    console.log("Seeding tasks...");
    const tasks = await Task.insertMany([
      {
        title: "Setup project structure",
        description: "Initialize Node.js, TypeScript, Express, Mongoose.",
        status: "DONE",
        priority: "HIGH",
        projectId: jiraCloneProject._id,
        reporterId: adminUser._id,
        assigneeId: adminUser._id,
        position: 0,
        taskNumber: 1,
      },
      {
        title: "Implement user authentication",
        description: "Create user model, registration, login, JWT.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        projectId: jiraCloneProject._id,
        reporterId: adminUser._id,
        assigneeId: memberUser._id,
        position: 1,
        taskNumber: 2,
      },
      {
        title: "Design database schema",
        description: "Define models for User, Project, Task, Comment.",
        status: "TODO",
        priority: "MEDIUM",
        projectId: jiraCloneProject._id,
        reporterId: adminUser._id,
        position: 2,
        taskNumber: 3,
      },
    ]);
    const task1 = tasks[0];
    const task2 = tasks[1];
    console.log("Tasks seeded.");

    console.log("Seeding comments...");
    await Comment.insertMany([
      {
        content: "Great start!",
        taskId: task1._id,
        authorId: adminUser._id,
      },
      {
        content: "Working on it, will update soon.",
        taskId: task2._id,
        authorId: memberUser._id,
      },
    ]);
    console.log("Comments seeded.");

    console.log("Database seeding complete! 🎉");
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};

seedDatabase();
