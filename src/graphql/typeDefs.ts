export const typeDefs = `#graphql
  scalar Date

  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
  }

  type User {
    id: ID!
    email: String!
    name: String!
    avatar: String
    role: String!
  }

  type Project {
    id: ID!
    name: String!
    key: String!
    description: String
    owner: User!
    members: [User!]!
    createdAt: Date!
    updatedAt: Date!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    priority: TaskPriority!
    project: Project!
    assignee: User
    reporter: User!
    position: Int!
    taskKey: String!
    taskNumber: Int!
    createdAt: Date!
    updatedAt: Date!
  }

  type Comment {
    id: ID!
    content: String!
    task: Task!
    author: User!
    isEdited: Boolean!
    editedAt: Date
    createdAt: Date!
    updatedAt: Date!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type TaskUpdatePayload {
    action: String!
    task: Task
  }

  type Query {
    me: User!
    users: [User!]!
    projects: [Project!]!
    project(id: ID!): Project
    tasks(projectId: ID!): [Task!]!
    task(id: ID!): Task
    myTasks: [Task!]!
    comments(taskId: ID!): [Comment!]!
  }

  type Mutation {
    register(email: String!, password: String!, name: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    
    createProject(name: String!, key: String!, description: String): Project!
    updateProject(id: ID!, name: String, description: String): Project!
    deleteProject(id: ID!): Boolean!
    addProjectMember(projectId: ID!, userId: ID!): Project!
    removeProjectMember(projectId: ID!, userId: ID!): Project!
    
    createTask(title: String!, projectId: ID!, description: String, priority: TaskPriority, assigneeId: ID): Task!
    updateTask(id: ID!, title: String, description: String, status: TaskStatus, priority: TaskPriority, assigneeId: ID): Task!
    deleteTask(id: ID!): Boolean!
    moveTask(id: ID!, status: TaskStatus!, position: Int!): Task!
    
    createComment(content: String!, taskId: ID!): Comment!
    updateComment(id: ID!, content: String!): Comment!
    deleteComment(id: ID!): Boolean!
  }

  type Subscription {
    taskUpdated(projectId: ID!): TaskUpdatePayload!
    commentAdded(taskId: ID!): Comment!
  }
`;
