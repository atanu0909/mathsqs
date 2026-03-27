require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});

// Helper: convert buffer to Gemini-compatible inline data
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}

// Detect MIME type from file
function getMimeType(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeMap = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return mimeMap[ext] || file.mimetype || "application/octet-stream";
}

// Main generation endpoint
app.post(
  "/api/generate",
  upload.fields([
    { name: "bookFile", maxCount: 1 },
    { name: "patternFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { numQuestions, difficulty, chapters, examName, className, subject, timeAllowed, maxMarks } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Server misconfiguration: GEMINI_API_KEY is not set." });
      }

      if (!req.files?.bookFile?.[0]) {
        return res.status(400).json({ error: "Please upload a math book PDF or image." });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const bookFile = req.files.bookFile[0];
      const patternFile = req.files?.patternFile?.[0];

      // Build parts array
      const parts = [];

      // Add the book file
      parts.push(bufferToGenerativePart(bookFile.buffer, getMimeType(bookFile)));

      // Add exam pattern if provided
      if (patternFile) {
        parts.push(bufferToGenerativePart(patternFile.buffer, getMimeType(patternFile)));
      }

      // Build the prompt
      let patternInstruction = "";
      if (patternFile) {
        patternInstruction = `
**⚠️ EXAM PATTERN PROVIDED (Second File):**
दूसरी फाइल एक परीक्षा पैटर्न/सैंपल पेपर है। इसका उपयोग **केवल प्रश्न पत्र के ढाँचे (structure/format)** के लिए करें:
- खंडों की संख्या और नाम (Number of sections and their names)
- प्रत्येक खंड में प्रश्नों की संख्या (Number of questions per section)
- प्रश्नों के प्रकार — MCQ, लघु उत्तरीय, दीर्घ उत्तरीय आदि (Question types)
- अंक वितरण (Marks distribution per question and section)
- सामान्य निर्देश (General instructions format)

**🚫 STRICTLY DO NOT copy or rephrase any questions from the pattern file.**
**✅ ALL question content (text, numbers, equations, options) MUST come ONLY from the FIRST file (textbook/book PDF).**
The pattern is ONLY a structural template. Generate completely NEW questions based on the textbook content while following the pattern's format.`;
      }

      const prompt = `You are an expert Indian mathematics teacher.

**YOUR PRIMARY TASK:**
1. **READ the FIRST uploaded file** — this is a mathematics TEXTBOOK/BOOK. Study its content, topics, theorems, examples, exercises, and concepts thoroughly.
2. **Generate a question paper** with questions derived **EXCLUSIVELY from the textbook content** (first file).
${patternFile ? `3. **USE the SECOND uploaded file** (exam pattern) ONLY as a structural template — follow its format, sections, marks distribution, and question types. But ALL question content must come from the TEXTBOOK (first file), NOT from the pattern.` : ""}

**🚨 ABSOLUTE RULE: Every single question in the output MUST be based on topics, concepts, formulas, theorems, or exercises found in the TEXTBOOK (first file). Do NOT invent questions on topics not covered in the textbook. Do NOT copy questions from the pattern file.**

${patternInstruction}

**Settings:**
- Number of questions: ${numQuestions || "15-20"}
- Difficulty level: ${difficulty || "Medium (मध्यम)"}
${chapters ? `- Focus on chapters/topics: ${chapters}` : "- Cover all available topics from the uploaded textbook content"}
${examName ? `- Exam name: ${examName}` : ""}
${className ? `- Class: ${className}` : ""}
${subject ? `- Subject: ${subject}` : "- Subject: गणित (Mathematics)"}
${timeAllowed ? `- Time allowed: ${timeAllowed}` : "- Time allowed: 3 घंटे"}
${maxMarks ? `- Maximum marks: ${maxMarks}` : "- Maximum marks: 80"}

**CRITICAL INSTRUCTIONS:**

1. **Output format**: Return a valid JSON object (no markdown fences, no extra text before/after the JSON).

2. **Language**: ALL question text, instructions, and section headers MUST be in Hindi (Devanagari script). 

3. **Mathematics**: ALL mathematical expressions, equations, formulas MUST be written in LaTeX notation (e.g., \\\\frac{1}{2}, x^2 + y^2 = r^2, \\\\int_0^1 f(x) dx).

4. **Question Source**: ALL questions MUST be derived from the textbook (first file) content. Create questions based on:
   - Definitions and theorems from the textbook
   - Similar problems to the exercises in the textbook
   - Concepts and formulas explained in the textbook chapters
   - Examples and solved problems in the textbook (create variations, do not copy verbatim)
   Do NOT ask questions about topics NOT present in the textbook.

5. **JSON Structure**:
{
  "paperTitle": "गणित प्रश्न पत्र",
  "examName": "${examName || "वार्षिक परीक्षा"}",
  "className": "${className || ""}",
  "subject": "${subject || "गणित"}",
  "timeAllowed": "${timeAllowed || "3 घंटे"}",
  "maxMarks": ${maxMarks || 80},
  "generalInstructions": [
    "सभी प्रश्न अनिवार्य हैं।",
    "प्रत्येक प्रश्न के अंक उसके सामने अंकित हैं।"
  ],
  "sections": [
    {
      "name": "खंड - अ",
      "title": "बहुविकल्पीय प्रश्न",
      "instructions": "निम्नलिखित प्रश्नों में सही विकल्प चुनें।",
      "questions": [
        {
          "number": 1,
          "text": "Question text in Hindi with LaTeX math like \\\\(x^2 + 1\\\\)",
          "marks": 1,
          "type": "mcq",
          "options": ["विकल्प अ", "विकल्प ब", "विकल्प स", "विकल्प द"]
        }
      ]
    },
    {
      "name": "खंड - ब",
      "title": "लघु उत्तरीय प्रश्न",
      "instructions": "निम्नलिखित प्रश्नों के उत्तर दीजिए।",
      "questions": [
        {
          "number": 5,
          "text": "Question in Hindi...",
          "marks": 2,
          "type": "short"
        }
      ]
    }
  ]
}

6. **Question types** ${patternFile ? "(follow the pattern file's structure if provided)" : "(vary as appropriate)"}:
   - MCQ (बहुविकल्पीय) — 1 mark each
   - Very Short Answer (अति लघु उत्तरीय) — 1-2 marks each
   - Short Answer (लघु उत्तरीय) — 2-3 marks each
   - Long Answer (दीर्घ उत्तरीय) — 4-5 marks each

7. **Math expressions**: Use inline LaTeX: \\\\(expression\\\\) within text. Use display LaTeX: \\\\[expression\\\\] for standalone equations.

8. Ensure the total marks add up to the maxMarks specified.

9. Make questions educationally meaningful — not trivial, not impossibly hard.

Return ONLY the JSON object. No additional text.`;

      parts.push({ text: prompt });

      // Call Gemini
      const result = await model.generateContent(parts);
      const response = await result.response;
      let text = response.text();

      // Clean the response — strip markdown code fences if present
      text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

      // Parse JSON
      let paperData;
      try {
        paperData = JSON.parse(text);
      } catch (parseErr) {
        // Try to extract JSON from the text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          paperData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse Gemini response as JSON. Raw response: " + text.substring(0, 500));
        }
      }

      res.json({ success: true, data: paperData });
    } catch (err) {
      console.error("Generation error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate question paper.",
      });
    }
  }
);

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
