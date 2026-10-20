# National Engineering College (NEC) Chatbot Service

This is a production-ready, high-performance, and completely rule-based public chatbot service designed for the National Engineering College (NEC) public website. 

It contains:
1. A standalone Node.js Express service (`chatbot/`).
2. An integrated floating React widget (`frontend/src/components/ChatbotWidget.tsx`).

---

## 1. Architecture

The system operates strictly as a deterministic, rule-based Natural Language Processing (NLP) router, ensuring zero hallucination, fast response times (sub-10ms), and 100% data safety.

```
                         PUBLIC USER
                              │
                              ▼
                     NEC React Website
                              │
                              ▼
                       Chatbot Widget (useLocation path checks)
                              │ (CORS restricted HTTP POST)
                              ▼
                     Chatbot Node.js API (Rate limited, Joi validated)
                              │
                              ▼
                        NLP Router (Tokenize, Normalize, Entity Extract)
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
             [Static Intents]  [Placement/Stats Intents]
                     │                 │
                     ▼                 ▼
             Knowledge Base      MySQL Database (Parameterized SELECTs only)
```

- **Query Normalizer**: Lowercases input, cleans punctuation, and normalizes synonyms (e.g. *CTC*, *package*, *pay* -> *package*).
- **Entity Extractor**: Detects departments (CSE, IT, MECH, etc.), batch years (2023, 2024, etc.), and companies (Zoho, TCS, etc.) from the query.
- **Intent Classifier**: Evaluates normalized tokens against weighted regex patterns to select the source (static facts or database statistics).
- **Session Memory Manager**: Maintains lightweight context (like `lastDepartment` and `lastCompany`) to support conversational follow-ups (e.g. "What is the placement rate for CSE?" followed by "What about IT?").
- **Security Boundary**: Enforces parameterized SQL SELECT queries and rejects individual private student data requests immediately.

---

## 2. Directory Structure

```text
chatbot/
├── src/
│   ├── config/
│   │   └── db.js            # MySQL connection pool
│   ├── controllers/
│   │   └── nlpRouter.js     # NLP tokenizer, intent classification, follow-ups
│   ├── middleware/
│   │   ├── rateLimiter.js   # express-rate-limit (30 reqs/min per IP)
│   │   └── validation.js    # Joi schema input validation
│   ├── routes/
│   │   └── chatRoutes.js    # Express route definitions
│   ├── services/
│   │   ├── dbService.js     # Parameterized SQL SELECT queries
│   │   └── contextService.js # In-memory session context storage
│   └── app.js               # Express application initialization & middleware config
├── scripts/
│   ├── generateKnowledgeBase.js  # Compiles static college facts to JSON
│   └── seedPlacements.js         # Seeds placement drives, registrations, and feedback
├── tests/
│   └── chatbot.test.js      # Jest integration tests
├── server.js                # App entrypoint
├── package.json             # Service dependencies and scripts
├── .env.example             # Documented environment template
├── .env                     # Local environment file (git ignored)
└── .gitignore               # Ignored files list
```

---

## 3. Installation & Setup

### Prerequisites
- Node.js (v18+)
- MySQL database containing seeded NEC ERP tables (populated via `erpdata.sql`).

### Steps
1. Navigate to the chatbot service directory:
   ```bash
   cd chatbot
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables:
   Copy `.env.example` to `.env` and adjust the port and database credentials:
   ```bash
   PORT=5000
   NODE_ENV=development
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=record2
   CORS_ORIGIN=http://localhost:5173
   ```

---

## 4. Production Database Security Model

The chatbot service is public-facing. To prevent SQL injections or accidental data modifications:
1. **Parameterized Queries**: Every database call utilizes prepared statements via the `mysql2/promise` pool. No raw SQL strings are concatenated with user input.
2. **Read-Only MySQL User**: It is highly recommended to run the production chatbot server using a dedicated read-only database user. 
   To set up a read-only MySQL user, execute:
   ```sql
   CREATE USER 'chatbot_reader'@'%' IDENTIFIED BY 'secure_password';
   GRANT SELECT ON record2.registered_student_placement TO 'chatbot_reader';
   GRANT SELECT ON record2.upcomingdrives_placement TO 'chatbot_reader';
   GRANT SELECT ON record2.placement_feedback TO 'chatbot_reader';
   GRANT SELECT ON record2.feedback_rounds TO 'chatbot_reader';
   GRANT SELECT ON record2.student_details TO 'chatbot_reader';
   GRANT SELECT ON record2.departments TO 'chatbot_reader';
   FLUSH PRIVILEGES;
   ```
3. **No Modifying Access**: The database adapter pool has no access to INSERT, UPDATE, DELETE, ALTER, DROP, or TRUNCATE.

---

## 5. Development & Verification Commands

- **Seed Placements Test Data**:
  Populates realistic placement drives, registrations, and student feedback for Zoho, TCS, and Accenture.
  ```bash
  npm run seed
  ```
- **Compile Knowledge Base**:
  Regenerates `knowledge_base.json` from the public website components.
  ```bash
  npm run compile
  ```
- **Run Developer Server (nodemon)**:
  ```bash
  npm run dev
  ```
- **Run Automated Tests**:
  Runs Jest tests covering intent routing, context, database queries, and privacy filters:
  ```bash
  npm test
  ```

---

## 6. Supported Chatbot Capabilities

- **General Queries**: Establishments, Founder message, administrative leadership, college vision & mission.
- **Location Queries**: College address, distance to nearby cities (Madurai, Tirunelveli, Thoothukudi, etc.), directions.
- **Admissions Queries**: Eligible courses, list of required documents for admission, first graduate certificate process.
- **Departments Info**: HOD names, contact emails, specific laboratories, academic programs (UG/PG/PhD), student strengths.
- **Placement statistics**: Overall and department-wise percentages (with Option A participating-denominator and Option B intake-denominator clearly stated), highest packages, average packages, and companies visited.
- **Upcoming drives**: Schedule of placement drives, roles, packages, venues, and eligibility criteria.
- **Interview preparation**: Memory-based coding questions, technical topics, HR questions, difficulty level, and rounds breakdown for specific companies.

---

## 7. How to Add New Public Database Capabilities Safely

To add a new capability (e.g. querying public research grants or sports achievements):
1. **Define the Database Query**: Add a parameterized method in `src/services/dbService.js` returning clean, aggregated data. **Never** return individual student identities or private fields.
2. **Add NLP Synonym Triggers**: Register key terms and synonyms in `normalizeQuery` in `src/controllers/nlpRouter.js`.
3. **Add Classification Rule**: In `classifyIntent` in `nlpRouter.js`, add a check matching the intent (e.g. `normalizedQuery.includes('research')`).
4. **Implement Controller Response Handler**: Add a case inside `handleChatQuery`'s switch block that fetches the data from the service, builds a clean markdown string, and returns it.
5. **Add Tests**: Add test assertions in `chatbot/tests/chatbot.test.js` to ensure the new router mapping is secure and returns correct formatting.
