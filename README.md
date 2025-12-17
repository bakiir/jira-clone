# Jira Clone Backend

This project is the backend for a Jira-like application, designed to manage projects, tasks, users, and comments. It leverages modern technologies to provide a robust and scalable API.

## Features

*   **User Authentication**: Secure user registration, login, and session management using JWT.
*   **Project Management**: Create, read, update, and delete projects.
*   **Task Management**: Create, assign, track, and update tasks within projects.
*   **Commenting System**: Add and manage comments on tasks.
*   **Real-time Updates**: GraphQL Subscriptions for real-time notifications and updates.
*   **Database Integration**: Persistent storage for all application data.

## Technologies Used

*   **Node.js**: JavaScript runtime environment.
*   **TypeScript**: Statically typed superset of JavaScript.
*   **GraphQL**: Query language for your API, and a runtime for fulfilling those queries with your existing data.
*   **Apollo Server**: Production-ready GraphQL server.
*   **TypeORM**: ORM for TypeScript and JavaScript (ES7, ES6, ES5). Supports MySQL, PostgreSQL, MariaDB, SQLite, MS SQL Server, Oracle, SAP Hana, WebSQL databases.
*   **PostgreSQL**: Powerful, open-source object-relational database system.
*   **JWT (JSON Web Tokens)**: For secure authentication and authorization.
*   **Bcrypt**: For hashing passwords securely.
*   **Jest**: JavaScript testing framework.

## Setup and Installation

### Prerequisites

Before you begin, ensure you have the following installed:

*   Node.js (LTS version recommended)
*   npm or Yarn
*   PostgreSQL

### Steps

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/jira-clone-backend.git
    cd jira-clone-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory of the project and add the following environment variables. Replace the placeholder values with your actual configuration.

    ```
    PORT=4000
    DATABASE_URL="postgresql://user:password@localhost:5432/jira_clone_db"
    JWT_SECRET="your_jwt_secret_key"
    # Add any other environment variables your application needs
    ```

4.  **Database Setup:**
    Ensure your PostgreSQL server is running. The application will automatically run migrations on startup if configured to do so, or you can run them manually:
    ```bash
    # Example for TypeORM migrations (adjust based on your actual setup)
    npm run typeorm migration:run
    ```

## Running the Project

### Development Mode

To run the project in development mode with hot-reloading:

```bash
npm run dev
# or
yarn dev
```

The server will typically start on `http://localhost:4000` (or the port specified in your `.env` file).

### Production Build

To build the project for production:

```bash
npm run build
# or
yarn build
```

To start the compiled production server:

```bash
npm start
# or
yarn start
```

## Testing

To run the unit and integration tests:

```bash
npm test
# or
yarn test
```



## Folder Structure

```
.
├── src/
│   ├── server.ts             # Main application entry point
│   ├── config/               # Database and other configurations
│   │   └── db.ts
│   ├── graphql/              # GraphQL schema, resolvers, and context
│   │   ├── context.ts
│   │   ├── resolvers.ts
│   │   └── typeDefs.ts
│   ├── models/               # TypeORM entities/models
│   │   ├── Comment.model.ts
│   │   ├── Project.model.ts
│   │   ├── Task.model.ts
│   │   └── User.model.ts
│   ├── tests/                # Unit and integration tests
│   │   └── utils/
│   │       ├── bcrypt.test.ts
│   │       └── jwt.test.ts
│   └── utils/                # Utility functions (e.g., bcrypt, jwt)
│       ├── bcrypt.ts
│       └── jwt.ts
├── .gitignore
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```
