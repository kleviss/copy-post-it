// Load environment variables from parent directory (.env file)
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// Use Prisma client from root node_modules
const { PrismaClient } = require("../node_modules/@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PDFDocument } = require("pdf-lib");

const prisma = new PrismaClient();
const app = express();

// Middleware - CORS configuration
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((url) => url.trim()) : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
const invoicesDir = path.join(__dirname, "../invoices");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Helper function to count PDF pages
async function countPDFPages(filePath) {
  try {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error("Error counting PDF pages:", error);
    // Default to 1 page if counting fails
    return 1;
  }
}

// Helper function to generate invoice PDF
async function generateInvoicePDF(request, user) {
  const invoiceDoc = await PDFDocument.create();
  const page = invoiceDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const font = await invoiceDoc.embedFont("Helvetica");
  const fontSize = 12;
  let yPosition = height - 50;

  // Helper to draw text
  const drawText = (text, x, y, size = fontSize, fontObj = font) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: fontObj,
    });
  };

  // Invoice Header
  drawText("INVOICE", 50, yPosition, 24);
  yPosition -= 40;

  // Invoice Details
  drawText(`Invoice ID: ${request.id}`, 50, yPosition);
  yPosition -= 20;
  drawText(`Date: ${new Date(request.createdAt).toLocaleDateString()}`, 50, yPosition);
  yPosition -= 20;
  drawText(`Status: ${request.status}`, 50, yPosition);
  yPosition -= 30;

  // Customer Info
  drawText("Bill To:", 50, yPosition, fontSize + 2);
  yPosition -= 20;
  drawText(user.name || "N/A", 50, yPosition);
  yPosition -= 20;
  drawText(user.email, 50, yPosition);
  yPosition -= 40;

  // Line Items
  drawText("Description", 50, yPosition);
  drawText("Amount", 450, yPosition);
  yPosition -= 30;

  drawText(`Printing (${request.pageCount} pages × €0.50)`, 50, yPosition);
  drawText(`€${request.printCost.toFixed(2)}`, 450, yPosition);
  yPosition -= 25;

  drawText("Posting/Shipping", 50, yPosition);
  drawText(`€${request.postingCost.toFixed(2)}`, 450, yPosition);
  yPosition -= 25;

  drawText("System Fee", 50, yPosition);
  drawText(`€${request.systemFee.toFixed(2)}`, 450, yPosition);
  yPosition -= 30;

  // Total
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: 545, y: yPosition },
    thickness: 1,
  });
  yPosition -= 25;

  drawText("Total:", 50, yPosition, fontSize + 2);
  drawText(`€${request.totalCost.toFixed(2)}`, 450, yPosition, fontSize + 2);

  // Save invoice
  const pdfBytes = await invoiceDoc.save();
  const invoiceFileName = `invoice-${request.id}-${Date.now()}.pdf`;
  const invoicePath = path.join(invoicesDir, invoiceFileName);
  fs.writeFileSync(invoicePath, pdfBytes);

  return `/invoices/${invoiceFileName}`;
}

// Email service (using Resend)
async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.log("⚠️  Email service not configured. Would send:", { to, subject });
    return { success: false, reason: "RESEND_API_KEY not set" };
  }

  const { Resend } = require("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const from = process.env.EMAIL_FROM || "noreply@copy-post-it.com";
    console.log("📧 Sending email:", { to, from, subject });

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully:", {
      id: result.data?.id,
      to,
      subject,
    });
    return { success: true, data: result.data };
  } catch (error) {
    console.error("❌ Error sending email:", {
      to,
      subject,
      error: error.message,
      name: error.name,
      response: error.response?.data || error.response,
      status: error.response?.status,
    });
    // Don't throw - emails are non-critical, just log the error
    return { success: false, error: error.message };
  }
}

// Root route - API information
app.get("/", (req, res) => {
  res.json({
    message: "Copy Post It API Server",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (requires authentication)",
      },
      requests: {
        create: "POST /api/requests (requires authentication)",
        list: "GET /api/requests (requires authentication)",
        get: "GET /api/requests/:id (requires authentication)",
        updateStatus: "PATCH /api/requests/:id/status (requires admin)",
      },
    },
    docs: "See README.md for API documentation",
  });
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Send confirmation email (non-blocking)
    sendEmail(user.email, "Welcome to Copy Post It", `<h1>Welcome!</h1><p>Your account has been created successfully.</p>`);

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Print Request Routes
app.post("/api/requests", authenticateToken, upload.array("pdfs"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No PDF files uploaded" });
    }

    const { postingCost } = req.body;
    const postingCostValue = parseFloat(postingCost) || 0;

    const requests = [];

    for (const file of req.files) {
      const pageCount = await countPDFPages(file.path);
      const printCost = pageCount * 0.5;
      const systemFee = 1.0;
      const totalCost = printCost + postingCostValue + systemFee;

      const request = await prisma.printRequest.create({
        data: {
          userId: req.user.userId,
          pdfUrl: `/uploads/${file.filename}`,
          pdfFileName: file.originalname,
          pageCount,
          postingCost: postingCostValue,
          systemFee,
          printCost,
          totalCost,
        },
        include: { user: true },
      });

      // Generate invoice
      const invoiceUrl = await generateInvoicePDF(request, request.user);
      const updatedRequest = await prisma.printRequest.update({
        where: { id: request.id },
        data: { invoiceUrl },
      });

      // Send invoice email (non-blocking)
      sendEmail(
        request.user.email,
        `Invoice for Print Request #${request.id}`,
        `
          <h1>Your Print Request Has Been Submitted</h1>
          <p>Request ID: ${request.id}</p>
          <p>Pages: ${pageCount}</p>
          <p>Total Cost: €${totalCost.toFixed(2)}</p>
          <p>Status: ${request.status}</p>
          <p>Your invoice is attached.</p>
        `
      );

      requests.push(updatedRequest);
    }

    res.json({ requests });
  } catch (error) {
    console.error("Request creation error:", error);
    res.status(500).json({ error: "Failed to create print request" });
  }
});

app.get("/api/requests", authenticateToken, async (req, res) => {
  try {
    const where = req.user.role === "admin" ? {} : { userId: req.user.userId };
    const requests = await prisma.printRequest.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.get("/api/requests/:id", authenticateToken, async (req, res) => {
  try {
    const request = await prisma.printRequest.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (req.user.role !== "admin" && request.userId !== req.user.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ request });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

app.patch("/api/requests/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, postingCost } = req.body;

    const existingRequest = await prisma.printRequest.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: "Request not found" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (postingCost !== undefined) {
      updateData.postingCost = parseFloat(postingCost);
      // Recalculate total
      updateData.totalCost = existingRequest.printCost + parseFloat(postingCost) + existingRequest.systemFee;
    }

    const updatedRequest = await prisma.printRequest.update({
      where: { id: req.params.id },
      data: updateData,
      include: { user: true },
    });

    // Log status change
    if (status && status !== existingRequest.status) {
      await prisma.statusLog.create({
        data: {
          requestId: req.params.id,
          oldStatus: existingRequest.status,
          newStatus: status,
          changedBy: req.user.userId,
        },
      });

      // Send status update email (non-blocking)
      sendEmail(
        existingRequest.user.email,
        `Print Request Status Updated - #${req.params.id}`,
        `
          <h1>Status Update</h1>
          <p>Your print request #${req.params.id} status has been updated.</p>
          <p><strong>New Status:</strong> ${status}</p>
          <p>Previous Status: ${existingRequest.status}</p>
        `
      );
    }

    res.json({ request: updatedRequest });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Serve invoice files
app.use("/invoices", express.static(invoicesDir));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
