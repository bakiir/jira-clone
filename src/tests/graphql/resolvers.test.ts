import { resolvers } from "../../graphql/resolvers";
import { GraphQLError } from "graphql";
import { User } from "../../models/User.model";
import { Project } from "../../models/Project.model";
import { Task } from "../../models/Task.model";
import { Comment } from "../../models/Comment.model";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { generateToken } from "../../utils/jwt";

// Mock Mongoose models
jest.mock("../../models/User.model");
jest.mock("../../models/Project.model");
jest.mock("../../models/Task.model");
jest.mock("../../models/Comment.model");

// Mock utility functions
jest.mock("../../utils/bcrypt");
jest.mock("../../utils/jwt");

const mockUserId = "60d5ec49f1c2c3001c8c4a01"; // Example valid ObjectId
const mockContext = { userId: mockUserId };
const mockUnauthenticatedContext = { userId: undefined };

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe("Query Resolvers", () => {
  describe("me", () => {
    it("should return the authenticated user", async () => {
      const mockUser = {
        id: mockUserId,
        email: "test@example.com",
        name: "Test User",
      };
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolvers.Query.me(
        null,
        null,
        mockContext as any
      );
      expect(result).toEqual(mockUser);
      expect(User.findById).toHaveBeenCalledWith(mockUserId);
    });

    it("should throw UNAUTHENTICATED error if no userId in context", async () => {
      await expect(
        resolvers.Query.me(null, null, mockUnauthenticatedContext as any)
      ).rejects.toThrow(
        new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      );
      expect(User.findById).not.toHaveBeenCalled();
    });
  });

  describe("users", () => {
    it("should return all users", async () => {
      const mockUsers = [
        { id: "1", name: "User 1" },
        { id: "2", name: "User 2" },
      ];
      (User.find as jest.Mock).mockResolvedValue(mockUsers);

      const result = await resolvers.Query.users();
      expect(result).toEqual(mockUsers);
      expect(User.find).toHaveBeenCalled();
    });
  });

  describe("projects", () => {
    it("should return projects for authenticated user", async () => {
      const mockProjects = [{ id: "p1", name: "Project 1" }];
      (Project.find as jest.Mock).mockResolvedValue(mockProjects);

      const result = await resolvers.Query.projects(
        null,
        null,
        mockContext as any
      );
      expect(result).toEqual(mockProjects);
      expect(Project.find).toHaveBeenCalledWith({
        $or: [{ ownerId: mockUserId }, { memberIds: mockUserId }],
      });
    });
  });

  describe("project", () => {
    const mockProjectId = "60d5ec49f1c2c3001c8c4a02";
    const mockProject = {
      id: mockProjectId,
      name: "Test Project",
      ownerId: mockUserId,
      memberIds: [mockUserId],
      toString: () => mockProjectId,
    };

    it("should return a project if user is owner", async () => {
      (Project.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        ownerId: mockUserId,
        memberIds: [],
      });

      const result = await resolvers.Query.project(
        null,
        { id: mockProjectId },
        mockContext as any
      );
      expect(result).toEqual({
        ...mockProject,
        ownerId: mockUserId,
        memberIds: [],
      });
      expect(Project.findById).toHaveBeenCalledWith(mockProjectId);
    });

    it("should throw NOT_FOUND error if project not found", async () => {
      (Project.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        resolvers.Query.project(
          null,
          { id: mockProjectId },
          mockContext as any
        )
      ).rejects.toThrow(
        new GraphQLError("Project not found", {
          extensions: { code: "NOT_FOUND" },
        })
      );
    });

    it("should throw FORBIDDEN error if user is not owner or member", async () => {
      (Project.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        ownerId: "otherUser",
        memberIds: ["anotherUser"],
      });
      await expect(
        resolvers.Query.project(
          null,
          { id: mockProjectId },
          mockContext as any
        )
      ).rejects.toThrow(
        new GraphQLError("Access denied", {
          extensions: { code: "FORBIDDEN" },
        })
      );
    });
  });
});

describe("Mutation Resolvers", () => {
  describe("register", () => {
    const email = "newuser@example.com";
    const password = "password123";
    const name = "New User";
    const hashedPassword = "hashedPassword123";
    const token = "mockToken";

    beforeEach(() => {
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      (generateToken as jest.Mock).mockReturnValue(token);
    });

    it("should register a new user and return token and user", async () => {
      const mockUser = {
        id: mockUserId,
        email,
        name,
        password: hashedPassword,
      };
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await resolvers.Mutation.register(
        null,
        { email, password, name } as any
      );

      expect(hashPassword).toHaveBeenCalledWith(password);
      expect(User.create).toHaveBeenCalledWith({
        email,
        password: hashedPassword,
        name,
      });
      expect(generateToken).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ token, user: mockUser });
    });

    it("should throw BAD_USER_INPUT if email already exists", async () => {
      (User.findOne as jest.Mock).mockResolvedValue({ email });

      await expect(
        resolvers.Mutation.register(null, { email, password, name } as any)
      ).rejects.toThrow(
        new GraphQLError("Email already exists", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      );
      expect(hashPassword).not.toHaveBeenCalled();
      expect(User.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const email = "test@example.com";
    const password = "password123";
    const hashedPassword = "hashedPassword123";
    const token = "mockToken";

    beforeEach(() => {
      (comparePassword as jest.Mock).mockResolvedValue(true);
      (generateToken as jest.Mock).mockReturnValue(token);
    });

    it("should login a user and return token and user", async () => {
      const mockUser = {
        id: mockUserId,
        email,
        name: "Test User",
        password: hashedPassword,
      };
      // Mock the findOne().select() chain
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await resolvers.Mutation.login(
        null,
        { email, password } as any
      );

      expect(User.findOne).toHaveBeenCalledWith({ email });
      // The select method is called on the object returned by findOne
      expect((User.findOne as jest.Mock).mock.results[0].value.select).toHaveBeenCalledWith("+password");
      expect(comparePassword).toHaveBeenCalledWith(password, hashedPassword);
      expect(generateToken).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ token, user: mockUser });
    });

    it("should throw BAD_USER_INPUT if invalid password", async () => {
      const mockUser = {
        id: mockUserId,
        email,
        name: "Test User",
        password: hashedPassword,
      };
      // Mock the findOne().select() chain
      (User.findOne as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      (comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(
        resolvers.Mutation.login(null, { email, password } as any)
      ).rejects.toThrow(
        new GraphQLError("Invalid credentials", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      );
      expect(comparePassword).toHaveBeenCalledWith(password, hashedPassword);
      expect(generateToken).not.toHaveBeenCalled();
    });
  });

  describe("createProject", () => {
    const name = "New Project";
    const key = "NP";
    const description = "A new project";
    const mockProject = {
      id: "proj1",
      name,
      key: key.toUpperCase(),
      description,
      ownerId: mockUserId,
      memberIds: [mockUserId],
    };

    it("should create a new project", async () => {
      (Project.findOne as jest.Mock).mockResolvedValue(null);
      (Project.create as jest.Mock).mockResolvedValue(mockProject);

      const result = await resolvers.Mutation.createProject(
        null,
        { name, key, description } as any,
        mockContext as any
      );

      expect(Project.findOne).toHaveBeenCalledWith({ key });
      expect(Project.create).toHaveBeenCalledWith({
        name,
        key: key.toUpperCase(),
        description,
        ownerId: mockUserId,
        memberIds: [mockUserId],
      });
      expect(result).toEqual(mockProject);
    });

    it("should throw UNAUTHENTICATED error if no userId in context", async () => {
      await expect(
        resolvers.Mutation.createProject(
          null,
          { name, key, description } as any,
          mockUnauthenticatedContext as any
        )
      ).rejects.toThrow(
        new GraphQLError("Not authenticated", {
          extensions: { code: "UNAUTHENTICATED" },
        })
      );
      expect(Project.create).not.toHaveBeenCalled();
    });

    it("should throw BAD_USER_INPUT if project key already exists", async () => {
      (Project.findOne as jest.Mock).mockResolvedValue({ key });

      await expect(
        resolvers.Mutation.createProject(
          null,
          { name, key, description } as any,
          mockContext as any
        )
      ).rejects.toThrow(
        new GraphQLError("Project key already exists", {
          extensions: { code: "BAD_USER_INPUT" },
        })
      );
      expect(Project.create).not.toHaveBeenCalled();
    });
  });

  describe("updateProject", () => {
    const projectId = "60d5ec49f1c2c3001c8c4a02";
    const updatedName = "Updated Project Name";
    const updatedDescription = "Updated description";
    const mockProject = {
      id: projectId,
      name: "Old Name",
      description: "Old Description",
      ownerId: mockUserId,
      memberIds: [mockUserId],
      save: jest.fn().mockResolvedValue(true),
      toString: () => projectId,
    };

    it("should update a project if user is owner", async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const result = await resolvers.Mutation.updateProject(
        null,
        { id: projectId, name: updatedName, description: updatedDescription } as any,
        mockContext as any
      );

      expect(Project.findById).toHaveBeenCalledWith(projectId);
      expect(mockProject.name).toBe(updatedName);
      expect(mockProject.description).toBe(updatedDescription);
      expect(mockProject.save).toHaveBeenCalled();
      expect(result).toEqual(mockProject);
    });

    it("should throw FORBIDDEN error if user is not owner", async () => {
      const otherUserId = "60d5ec49f1c2c3001c8c4a03";
      (Project.findById as jest.Mock).mockResolvedValue({
        ...mockProject,
        ownerId: otherUserId,
      });

      await expect(
        resolvers.Mutation.updateProject(
          null,
          { id: projectId, name: updatedName } as any,
          mockContext as any
        )
      ).rejects.toThrow(
        new GraphQLError("Only owner can update project", {
          extensions: { code: "FORBIDDEN" },
        })
      );
      expect(mockProject.save).not.toHaveBeenCalled();
    });
  });
});
