// --- Core Dependencies ---
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const http = require("http");

dotenv.config();

// --- Custom Error Classes ---
class AppError extends Error {
  constructor(message, statusCode, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

class DatabaseError extends AppError {
  constructor(message = "Database operation failed", code = "DB_ERROR") {
    super(message, 500, code);
  }
}

// --- Validation Schemas ---
const quizSchema = Joi.object({
  title: Joi.string().required().trim().max(255),
  topic: Joi.string().trim().max(255).optional(),
  numQuestions: Joi.number().integer().min(1).required(),
  difficulty: Joi.string().valid("Easy", "Medium", "Hard").required(),
  questionType: Joi.string()
    .valid("MCQ", "True/False", "Fill in the Blanks")
    .required(),
  language: Joi.string()
    .valid(
      "english",
      "hindi",
      "spanish",
      "french",
      "german",
      "chinese",
      "japanese",
      "korean",
      "arabic"
    )
    .default("english"),
  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().required(),
        correctAnswer: Joi.alternatives()
          .try(Joi.string(), Joi.number(), Joi.boolean())
          .required(),
        explanation: Joi.string().allow("", null).optional(),
        options: Joi.array().items(Joi.string()).min(2).required(),
      })
    )
    .min(1)
    .required(),
}).required();

const quizResultSchema = Joi.object({
  quizId: Joi.number().integer().required(),
  score: Joi.number().integer().min(0).required(),
  totalQuestions: Joi.number().integer().min(1).required(),
  userAnswers: Joi.array()
    .items(
      Joi.object({
        questionIndex: Joi.number().integer().required(),
        answer: Joi.alternatives()
          .try(Joi.string(), Joi.number(), Joi.boolean(), null)
          .required(),
        correct: Joi.boolean().required(),
      })
    )
    .required(),
  timeTaken: Joi.number().integer().min(0).required(),
});

// Update the quiz history schema to match frontend data
const quizHistorySchema = Joi.object({
  quizId: Joi.number().integer().required(),
  promptUsed: Joi.string().required(),
  generationParameters: Joi.object({
    topic: Joi.string().required(),
    difficulty: Joi.string().valid("Easy", "Medium", "Hard").required(),
    numQuestions: Joi.number().integer().min(1).required(),
    questionType: Joi.string()
      .valid("MCQ", "True/False", "Fill in the Blanks")
      .required(),
    language: Joi.string()
      .valid(
        "english",
        "hindi",
        "spanish",
        "french",
        "german",
        "chinese",
        "japanese",
        "korean",
        "arabic"
      )
      .default("english"),
  }).required(),
}).required();

// --- Express Setup ---
const app = express();
const server = http.createServer(app);

// --- Database Setup ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Add database connection error handler
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Don't exit on transient errors
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Database connection was closed. Attempting to reconnect...');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection was refused.');
  }
});

// --- Middleware ---
const corsOptions = {
  origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "user-id",
    "username",
    "authorization",
    "Authorization",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply CORS before other middleware
app.use(cors(corsOptions));
app.use(express.json());

// --- Auth Middleware ---
const simpleAuth = (req, res, next) => {
  const userId = req.headers["user-id"];
  const username = req.headers["username"];

  if (!userId || !username) {
    return res.status(401).json({
      status: "error",
      message: "Authentication required",
    });
  }

  req.user = { userId, username };
  next();
};

// --- Database Initialization ---
const initializeTables = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create Quizzes Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        topic VARCHAR(255),
        num_questions INTEGER NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        question_type VARCHAR(50) NOT NULL,
        language VARCHAR(20) DEFAULT 'english' CHECK (
          language IN (
            'english', 'hindi', 'spanish', 'french', 
            'german', 'chinese', 'japanese', 'korean', 'arabic'
          )
        ),
        questions JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Quiz Results Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        user_answers JSONB,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        time_taken INTEGER
      );
    `);

    // Add Quiz History Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        prompt_used TEXT NOT NULL,
        generation_parameters JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_history_quiz_id ON quiz_history(quiz_id);
    `);

    await client.query("COMMIT");
    console.log("Database tables initialized successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error initializing tables:", error);
    throw new DatabaseError("Failed to initialize database tables");
  } finally {
    client.release();
  }
};

// --- API Routes ---

// Health Check
app.get("/health", async (req, res) => {
  try {
    const dbCheck = await pool.query("SELECT NOW()");
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        status: "connected",
        timestamp: dbCheck.rows[0].now,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Service unavailable",
    });
  }
});

// Create Quiz
app.post("/api/quizzes", simpleAuth, async (req, res, next) => {
  try {
    console.log("Quiz creation request:", {
      userId: req.user.userId,
      body: req.body,
    });

    // Add language to the request body if not provided
    if (!req.body.language) {
      req.body.language = "english";
    }

    const { error, value } = quizSchema.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (error) {
      console.log("Validation error:", error.details);
      throw new ValidationError(error.details.map((d) => d.message).join(", "));
    }

    // Validate questions array
    if (!Array.isArray(value.questions) || value.questions.length === 0) {
      throw new ValidationError(
        "Questions array is required and must not be empty"
      );
    }

    // Validate that numQuestions matches actual questions length
    if (value.numQuestions !== value.questions.length) {
      throw new ValidationError(
        `numQuestions (${value.numQuestions}) does not match actual number of questions (${value.questions.length})`
      );
    }

    // Additional validation for question options
    value.questions.forEach((q, idx) => {
      if (
        value.questionType === "MCQ" &&
        (!Array.isArray(q.options) || q.options.length < 2)
      ) {
        throw new ValidationError(
          `Question ${idx + 1} must have at least 2 options for MCQ type`
        );
      }
    });

    const result = await pool.query(
      `INSERT INTO quizzes (
        user_id, title, topic, num_questions, difficulty, 
        question_type, questions, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, title, topic, num_questions, difficulty, question_type, language`,
      [
        req.user.userId,
        value.title,
        value.topic,
        value.numQuestions,
        value.difficulty,
        value.questionType,
        JSON.stringify(value.questions),
        value.language || "english",
      ]
    );

    const createdQuiz = result.rows[0];
    console.log("Quiz created successfully:", createdQuiz.id);

    res.status(201).json({
      status: "success",
      message: "Quiz created successfully",
      quiz: {
        id: createdQuiz.id,
        title: createdQuiz.title,
        topic: createdQuiz.topic,
        numQuestions: createdQuiz.num_questions,
        difficulty: createdQuiz.difficulty,
        questionType: createdQuiz.question_type,
        language: createdQuiz.language,
      },
    });
  } catch (error) {
    console.error("Quiz creation error:", {
      message: error.message,
      stack: error.stack,
      validation:
        error instanceof ValidationError ? "validation error" : "other error",
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: "error",
        type: "validation",
        message: error.message,
      });
    }
    next(error);
  }
});

// Get User's Quizzes
app.get("/api/quizzes", simpleAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        q.id, q.title, q.topic, q.num_questions, 
        q.difficulty, q.question_type, q.created_at,
        COUNT(qr.id) as attempts_count,
        MAX(qr.score) as highest_score
      FROM quizzes q
      LEFT JOIN quiz_results qr ON q.id = qr.quiz_id AND qr.user_id = q.user_id
      WHERE q.user_id = $1 
      GROUP BY q.id
      ORDER BY q.created_at DESC 
      LIMIT $2 OFFSET $3`;

    const [quizzes, countResult] = await Promise.all([
      pool.query(query, [req.user.userId, limit, offset]),
      pool.query('SELECT COUNT(*) FROM quizzes WHERE user_id = $1', [req.user.userId])
    ]);

    const totalQuizzes = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalQuizzes / limit);

    res.json({
      status: "success",
      quizzes: quizzes.rows.map(quiz => ({
        ...quiz,
        attempts_count: parseInt(quiz.attempts_count || 0),
        highest_score: parseInt(quiz.highest_score || 0)
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalQuizzes,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get Quiz for Taking
app.get("/api/quizzes/:id/take", simpleAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, title, topic, num_questions, difficulty, question_type,
        (SELECT jsonb_agg(
          jsonb_build_object(
            'question', q->>'question',
            'options', q->'options'
          )
        ) FROM jsonb_array_elements(questions) q)
       FROM quizzes WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Quiz not found");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Submit Quiz Result
app.post("/api/quiz-results", simpleAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    console.log("Received quiz results:", req.body);

    const { error, value } = quizResultSchema.validate(req.body);
    if (error) {
      console.log("Validation error:", error.details);
      throw new ValidationError(error.details[0].message);
    }

    // Verify quiz exists
    const quizCheck = await client.query(
      "SELECT id FROM quizzes WHERE id = $1",
      [value.quizId]
    );

    if (quizCheck.rows.length === 0) {
      throw new ValidationError("Invalid quiz ID");
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO quiz_results (
        user_id, quiz_id, score, total_questions, 
        user_answers, time_taken
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        req.user.userId,
        value.quizId,
        value.score,
        value.totalQuestions,
        JSON.stringify(value.userAnswers),
        value.timeTaken,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Quiz result saved successfully",
      result: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Quiz result error:", error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: "error",
        type: "validation",
        message: error.message,
      });
    }
    next(error);
  } finally {
    client.release();
  }
});

// Update the quiz history endpoint
app.post("/api/quiz-history", simpleAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Log incoming request for debugging
    console.log("Quiz history request:", {
      userId: req.user.userId,
      body: req.body,
    });

    const { error, value } = quizHistorySchema.validate(req.body);
    if (error) {
      console.log("Validation error:", error.details);
      throw new ValidationError(error.details[0].message);
    }

    // Verify quiz exists
    const quizCheck = await client.query(
      "SELECT id FROM quizzes WHERE id = $1",
      [value.quizId]
    );

    if (quizCheck.rows.length === 0) {
      throw new ValidationError("Invalid quiz ID");
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO quiz_history (
        user_id, quiz_id, prompt_used, generation_parameters
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [
        req.user.userId,
        value.quizId,
        value.promptUsed,
        value.generationParameters,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message: "Quiz history saved successfully",
      history: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Quiz history error:", error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: "error",
        type: "validation",
        message: error.message,
      });
    }
    next(error);
  } finally {
    client.release();
  }
});

// Add these utility functions at the top of the file
const processQuizStatistics = (rows) => {
  const topics = new Set();
  const difficulties = new Set();
  
  rows.forEach(quiz => {
    if (quiz.topic) topics.add(quiz.topic);
    if (quiz.difficulty) difficulties.add(quiz.difficulty);
  });

  return {
    topics_attempted: Array.from(topics).join(', ') || 'None',
    difficulty_levels_attempted: Array.from(difficulties).join(', ') || 'None'
  };
};

// Update the statistics endpoint
app.get("/api/statistics", simpleAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Get overall statistics
    const [quizResults, quizzes, monthlyStats] = await Promise.all([
      client.query(`
        SELECT 
          COUNT(DISTINCT quiz_id) as total_quizzes_taken,
          COUNT(*) as total_attempts,
          COALESCE(AVG(CASE WHEN total_questions > 0 
            THEN (score::float / total_questions * 100) 
            ELSE 0 END), 0) as average_score,
          COALESCE(MAX(score), 0) as highest_score,
          MIN(completed_at) as first_attempt,
          MAX(completed_at) as last_attempt
        FROM quiz_results 
        WHERE user_id = $1
      `, [req.user.userId]),

      // Get all unique quizzes for topic and difficulty tracking
      client.query(`
        SELECT DISTINCT topic, difficulty 
        FROM quizzes 
        WHERE user_id = $1 
        AND id IN (SELECT quiz_id FROM quiz_results WHERE user_id = $1)
      `, [req.user.userId]),

      // Get monthly progress
      client.query(`
        SELECT 
          DATE_TRUNC('month', completed_at) as month,
          COUNT(*) as attempts,
          AVG(CASE WHEN total_questions > 0 
            THEN (score::float / total_questions * 100) 
            ELSE 0 END) as average_score
        FROM quiz_results
        WHERE user_id = $1
        GROUP BY DATE_TRUNC('month', completed_at)
        ORDER BY month DESC
        LIMIT 12
      `, [req.user.userId])
    ]);

    // Process quiz statistics
    const { topics_attempted, difficulty_levels_attempted } = processQuizStatistics(quizzes.rows);

    // Format the response
    const statistics = {
      overall: {
        total_quizzes_taken: parseInt(quizResults.rows[0]?.total_quizzes_taken || 0),
        total_attempts: parseInt(quizResults.rows[0]?.total_attempts || 0),
        average_score: parseFloat(quizResults.rows[0]?.average_score || 0).toFixed(2),
        highest_score: parseInt(quizResults.rows[0]?.highest_score || 0),
        first_attempt: quizResults.rows[0]?.first_attempt || null,
        last_attempt: quizResults.rows[0]?.last_attempt || null,
        topics_attempted,
        difficulty_levels_attempted
      },
      monthly_progress: monthlyStats.rows.map(stat => ({
        month: stat.month,
        attempts: parseInt(stat.attempts),
        average_score: parseFloat(stat.average_score).toFixed(2)
      }))
    };

    res.json({
      status: "success",
      statistics
    });
  } catch (error) {
    console.error("Statistics error:", error);
    next(error);
  } finally {
    client.release();
  }
});

// Update the quiz details endpoint
app.get("/api/quizzes/:id", simpleAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      WITH quiz_attempts AS (
        SELECT 
          quiz_id,
          COUNT(*) as total_attempts,
          MAX(score) as highest_score,
          AVG(CAST(score AS FLOAT)) as avg_score,
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'score', score,
              'total_questions', total_questions,
              'time_taken', time_taken,
              'completed_at', completed_at,
              'user_answers', user_answers,
              'attempt_date', completed_at
            ) ORDER BY completed_at DESC
          ) as attempt_history
        FROM quiz_results
        WHERE quiz_id = $1 AND user_id = $2
        GROUP BY quiz_id
      )
      SELECT 
        q.id,
        q.title,
        q.topic,
        q.num_questions,
        q.difficulty,
        q.question_type,
        q.language,
        q.questions,
        q.created_at,
        COALESCE(qa.total_attempts, 0) as attempts_count,
        COALESCE(qa.highest_score, 0) as highest_score,
        COALESCE(qa.avg_score, 0) as average_score,
        qa.attempt_history
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      WHERE q.id = $1 AND q.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Quiz not found"
      });
    }

    const quizDetails = result.rows[0];

    // Format response with status field to match frontend expectations
    const response = {
      status: "success",
      quiz: {
        id: quizDetails.id,
        topic: quizDetails.topic,
        title: quizDetails.title,
        difficulty: quizDetails.difficulty,
        question_type: quizDetails.question_type,
        num_questions: quizDetails.num_questions,
        created_at: quizDetails.created_at,
        highest_score: parseInt(quizDetails.highest_score),
        attempts_count: parseInt(quizDetails.attempts_count),
        questions: quizDetails.questions.map((q, index) => ({
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "No explanation provided"
        })),
        attempt_history: (quizDetails.attempt_history || []).map(attempt => ({
          ...attempt,
          score: parseInt(attempt.score),
          total_questions: parseInt(attempt.total_questions),
          time_taken: parseInt(attempt.time_taken)
        }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Quiz details error:", {
      error,
      quizId: req.params.id,
      userId: req.user.userId
    });
    next(error);
  } finally {
    client.release();
  }
});

// --- Error Handler ---
app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

// --- Server Startup ---
const checkPort = (port) => {
  return new Promise((resolve, reject) => {
    const tester = require('net').createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} is busy. Please try another port.`);
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
};

const startServer = async () => {
  try {
    const PORT = process.env.PORT || 5000;
    
    // Check if port is available
    const portAvailable = await checkPort(PORT);
    if (!portAvailable) {
      throw new Error(`Port ${PORT} is in use. Please use a different port.`);
    }

    console.log("Attempting to connect to database...");
    await pool.query("SELECT 1"); // Test database connection
    console.log("Database connection successful.");

    console.log("Initializing database tables...");
    await initializeTables();
    console.log("Database initialization complete.");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS enabled for: ${corsOptions.origin.join(", ")}`);
    });
  } catch (error) {
    console.error("----------------------------------------");
    console.error(">>> FATAL: Failed to start server <<<");
    console.error(error instanceof DatabaseError ? error : new DatabaseError(error.message));
    console.error("----------------------------------------");
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, pool, server, startServer };
