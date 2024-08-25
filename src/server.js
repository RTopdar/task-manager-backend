import express from "express";
import dotenv from "dotenv";
import { connectToDb, getDb } from "./db.js";
import cors from "cors";
import { ObjectId } from "mongodb";
import { body, param, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
let db;
let userEmail;
const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();
connectToDb((err) => {
  if (err) {
    console.log("Error connecting to the database", err);
    process.exit(1);
  } else {
    console.log("Connected to the database");
    const LAUNCH_PORT = process.env.LAUNCH_PORT || 8080;
    app.listen(LAUNCH_PORT, () => {
      console.log(`Server is running on LAUNCH_PORT ${LAUNCH_PORT}`);
    });
    db = getDb();
  }
});

app.get("/", (req, res) => {
  res.send("Hello, World! V9.5");
});

const verifyToken = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ message: `Failed to authenticate token | ${err}` });
    }

    const { userId, exp } = decoded;
    userEmail = userId;

    // Check if token is expired
    if (exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ message: "Token has expired" });
    }

    // Check if user exists in the database
    try {
      const user = await db.collection("users").findOne({ email: userId });
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ message: `Failed to verify user | ${error}` });
    }
  });
};

app.get(
  "/tasks",
  verifyToken,

  (req, res) => {
    // Retrieve all tasks from the database

    let tasks = [];
    db.collection("tasks")
      .find({
        CREATED_BY: userEmail,
      })
      .forEach((element) => {
        tasks.push(element);
      })
      .then(() => {
        res.status(200).json(tasks);
      })
      .catch((err) => {
        res.status(500).json({ error: `Failed to retrieve tasks | ${err}` });
      });
  }
);

export {verifyToken};

app.post(
  "/tasks",
  [
    verifyToken,
    body("CREATED_BY")
      .isEmail()
      .withMessage("CREATED_BY must be a valid email"),
    body("CREATED_AT")
      .isISO8601()
      .withMessage("CREATED_AT must be a valid ISO 8601 date"),
    body("TASK_NAME")
      .isString()
      .notEmpty()
      .withMessage("TASK_NAME must be a non-empty string"),
    body("TASK_DESC")
      .isString()
      .withMessage("TASK_DESC must be a non-empty string"),
    body("TASK_TIME")
      .isISO8601()
      .withMessage("TASK_TIME must be a valid ISO 8601 date"),
    body("DONE").isBoolean().withMessage("DONE must be a boolean"),
    body("CATEGORY")
      .isString()
      .isIn([
        "Work",
        "Personal",
        "Urgent",
        "Important",
        "Low Priority",
        "Recurring",
        "Learning",
        "Health",
        "Finance",
        "Household",
        "Social",
        "Miscellaneous",
      ])
      .withMessage("CATEGORY must be one of the predefined options"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Create a new task
    const newTask = req.body;

    db.collection("tasks")
      .insertOne(newTask)
      .then((result) => {
        res.status(201).json(result);
      })
      .catch((err) => {
        res.status(500).json({ error: ` Failed to create task | ${err}` });
      });
  }
);

app.patch(
  "/tasks/:id",

  [
    verifyToken,
    param("id").isMongoId().withMessage("Invalid task ID"),
    body("CREATED_BY")
      .isEmail()
      .withMessage("CREATED_BY must be a valid email"),
    body("CREATED_AT")
      .isISO8601()
      .withMessage("CREATED_AT must be a valid ISO 8601 date"),
    body("TASK_NAME")
      .isString()
      .notEmpty()
      .withMessage("TASK_NAME must be a non-empty string"),
    body("TASK_DESC")
      .isString()
      .withMessage("TASK_DESC must be a non-empty string"),
    body("TASK_TIME")
      .isISO8601()
      .withMessage("TASK_TIME must be a valid ISO 8601 date"),
    body("DONE").isBoolean().withMessage("DONE must be a boolean"),
    body("CATEGORY")
      .isString()
      .isIn([
        "Work",
        "Personal",
        "Urgent",
        "Important",
        "Low Priority",
        "Recurring",
        "Learning",
        "Health",
        "Finance",
        "Household",
        "Social",
        "Miscellaneous",
      ])
      .withMessage("CATEGORY must be one of the predefined options"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const update = req.body;

    const taskId = req.params.id;

    db.collection("tasks")
      .updateOne(
        {
          _id: ObjectId.createFromHexString(taskId),
        },
        {
          $set: update,
        }
      )
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((err) => {
        res.status(500).json({ error: `Failed to update task | ${err}` });
      });
  }
);

app.delete("/tasks", [verifyToken], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let taskId = req.query.id;
  console.log(taskId);
  if (!ObjectId.isValid(taskId)) {
    return res.status(400).json({ error: "Invalid task ID" });
  }
  getDb()
    .collection("tasks")
    .deleteOne({ _id: ObjectId.createFromHexString(taskId) })
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => {
      res.status(500).json({ error: `Failed to delete task | ${err}` });
    });
});

app.post(
  "/tasks/mark",
  [verifyToken, body("id").isMongoId().withMessage("Invalid task ID")],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const taskId = req.body.id;
    db.collection("tasks")
      .updateOne(
        {
          _id: ObjectId.createFromHexString(taskId),
        },
        {
          $set: { DONE: true },
        }
      )
      .then((result) => {
        res.status(200).json(result);
      })
      .catch((err) => {
        res.status(500).json({ error: `Failed to mark task as done | ${err}` });
      });
  }
);

//fetch tasks based on status and category
app.get("/tasks/filter/", verifyToken, (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  let tasks = [];
  let done = req.query.done;
  const category = req.query.category;

  if (done === "true") {
    done = true;
  } else if (done === "false") {
    done = false;
  }

  if (done.length === 0) {
    db.collection("tasks")
      .find({
        CREATED_BY: userEmail,
        CATEGORY: category,
      })
      .forEach((element) => {
        tasks.push(element);
      })
      .then(() => {
        res.status(200).json(tasks);
      })
      .catch((err) => {
        res.status(500).json({ error: `Failed to retrieve tasks | ${err}` });
      });
  }
  if (category.length === 0) {
    db.collection("tasks")
      .find({
        CREATED_BY: userEmail,
        DONE: done,
      })
      .forEach((element) => {
        tasks.push(element);
      })
      .then(() => {
        res.status(200).json(tasks);
      })
      .catch((err) => {
        res.status(500).json({ error: `Failed to retrieve tasks | ${err}` });
      });
  } else if (done.length !== 0 && category.length !== 0) {
    db.collection("tasks")
      .find({
        CREATED_BY: userEmail,
        DONE: done,
        CATEGORY: category,
      })
      .forEach((element) => {
        tasks.push(element);
      })
      .then(() => {
        res.status(200).json(tasks);
      })
      .catch((err) => {
        res.status(500).json({ error: `Failed to retrieve tasks | ${err}` });
      });
  }
});

////////////////////////////////////////Login and Register////////////////////////////////////////
app.post(
  "/auth/register",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      // Check if user already exists
      const user = await db.collection("users").findOne({ email });
      if (user) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = { email, password: hashedPassword };
      await db.collection("users").insertOne(newUser);

      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      res.status(500).json({ error: `Failed to register user | ${err}` });
    }
  }
);

app.post(
  "/auth/login",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
      // Check if user exists
      const user = await db.collection("users").findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.email }, JWT_SECRET, {
        expiresIn: "1h",
      });
      const decoded = jwt.verify(token, JWT_SECRET);

      res
        .status(200)
        .json({ token: token, expiresIn: decoded.exp, userId: user.email });
    } catch (err) {
      res.status(500).json({ error: `Failed to login user | ${err}` });
    }
  }
);
