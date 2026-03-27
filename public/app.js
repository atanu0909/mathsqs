/* ========================================
   MATH QS GENERATOR — CLIENT-SIDE LOGIC
   ======================================== */

// State
let bookFile = null;
let patternFile = null;

// DOM Elements
const bookUploadZone = document.getElementById("bookUploadZone");
const bookFileInput = document.getElementById("bookFileInput");
const bookFileInfo = document.getElementById("bookFileInfo");
const bookFileName = document.getElementById("bookFileName");
const bookFileRemove = document.getElementById("bookFileRemove");
const patternUploadZone = document.getElementById("patternUploadZone");
const patternFileInput = document.getElementById("patternFileInput");
const patternFileInfo = document.getElementById("patternFileInfo");
const patternFileName = document.getElementById("patternFileName");
const patternFileRemove = document.getElementById("patternFileRemove");
const generateBtn = document.getElementById("generateBtn");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const paperPreviewWrapper = document.getElementById("paperPreviewWrapper");
const paperContainer = document.getElementById("paperContainer");
const downloadBtn = document.getElementById("downloadBtn");
const errorMessage = document.getElementById("errorMessage");
const loadingHint = document.getElementById("loadingHint");
const progressFill = document.getElementById("progressFill");
const retryBtn = document.getElementById("retryBtn");



// ======= FILE UPLOAD HANDLING =======
function setupUploadZone(zone, input, setFile, fileInfo, fileNameEl, removeBtn) {
  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("drag-over");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, setFile, zone, fileInfo, fileNameEl);
  });

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) handleFile(file, setFile, zone, fileInfo, fileNameEl);
  });

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setFile(null);
    input.value = "";
    zone.style.display = "";
    fileInfo.style.display = "none";
  });
}

function handleFile(file, setFile, zone, fileInfo, fileNameEl) {
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    showError("फ़ाइल बहुत बड़ी है (अधिकतम 20MB)");
    return;
  }
  setFile(file);
  zone.style.display = "none";
  fileInfo.style.display = "flex";
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
  fileNameEl.textContent = `📎 ${file.name} (${sizeMB}MB)`;
}

setupUploadZone(
  bookUploadZone, bookFileInput,
  (f) => { bookFile = f; },
  bookFileInfo, bookFileName, bookFileRemove
);

setupUploadZone(
  patternUploadZone, patternFileInput,
  (f) => { patternFile = f; },
  patternFileInfo, patternFileName, patternFileRemove
);

// ======= UI STATES =======
function showState(state) {
  emptyState.style.display = state === "empty" ? "" : "none";
  loadingState.style.display = state === "loading" ? "" : "none";
  errorState.style.display = state === "error" ? "" : "none";
  paperPreviewWrapper.style.display = state === "preview" ? "" : "none";
}

function showError(msg) {
  showState("error");
  errorMessage.textContent = msg;
}

// ======= LOADING ANIMATION =======
function getLoadingHints() {
  const subjectEl = document.getElementById("subject");
  const subjectVal = subjectEl ? subjectEl.value : "";
  const isPhysics = subjectVal.includes("Physics") || subjectVal.includes("भौतिक");
  const isChemistry = subjectVal.includes("Chemistry") || subjectVal.includes("रसायन");

  if (isPhysics) {
    return [
      "Gemini आपकी पुस्तक पढ़ रहा है...",
      "भौतिक विज्ञान के प्रश्न तैयार हो रहे हैं...",
      "सूत्र और संख्यात्मक प्रश्न बनाए जा रहे हैं...",
      "प्रश्न पत्र का ढाँचा बन रहा है...",
      "अंतिम स्पर्श दिए जा रहे हैं...",
    ];
  } else if (isChemistry) {
    return [
      "Gemini आपकी पुस्तक पढ़ रहा है...",
      "रसायन विज्ञान के प्रश्न तैयार हो रहे हैं...",
      "रासायनिक समीकरण और अभिक्रियाएँ तैयार हो रही हैं...",
      "प्रश्न पत्र का ढाँचा बन रहा है...",
      "अंतिम स्पर्श दिए जा रहे हैं...",
    ];
  }
  return [
    "Gemini आपकी पुस्तक पढ़ रहा है...",
    "गणित के प्रश्न तैयार हो रहे हैं...",
    "हिंदी में अनुवाद किया जा रहा है...",
    "प्रश्न पत्र का ढाँचा बन रहा है...",
    "अंतिम स्पर्श दिए जा रहे हैं...",
  ];
}

let hintInterval = null;
let progressInterval = null;

function startLoading() {
  showState("loading");
  generateBtn.disabled = true;
  let hintIdx = 0;
  let progress = 0;
  const hints = getLoadingHints();

  loadingHint.textContent = hints[0];
  progressFill.style.width = "0%";

  hintInterval = setInterval(() => {
    hintIdx = (hintIdx + 1) % hints.length;
    loadingHint.textContent = hints[hintIdx];
  }, 3000);

  progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 5 + 1, 90);
    progressFill.style.width = progress + "%";
  }, 500);
}

function stopLoading() {
  clearInterval(hintInterval);
  clearInterval(progressInterval);
  progressFill.style.width = "100%";
  generateBtn.disabled = false;
}

// ======= GENERATE =======
generateBtn.addEventListener("click", handleGenerate);
retryBtn.addEventListener("click", handleGenerate);

async function handleGenerate() {
  if (!bookFile) {
    showError("कृपया पुस्तक की PDF या Image अपलोड करें");
    return;
  }

  startLoading();

  try {
    const formData = new FormData();
    formData.append("bookFile", bookFile);
    if (patternFile) formData.append("patternFile", patternFile);

    // Gather settings
    const fields = ["examName", "className", "subject", "numQuestions", "timeAllowed", "maxMarks", "difficulty", "chapters", "includeAnswers"];
    fields.forEach((f) => {
      const el = document.getElementById(f);
      if (el && el.value) formData.append(f, el.value);
    });

    const res = await fetch("/api/generate", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || "Server error");
    }

    stopLoading();
    renderPaper(data.data);
    showState("preview");
  } catch (err) {
    stopLoading();
    showError(err.message || "प्रश्न पत्र बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
  }
}

// ======= RENDER PAPER =======
function renderPaper(paper) {
  const optionLabels = ["(अ)", "(ब)", "(स)", "(द)"];

  let html = `
    <div class="paper-header">
      <div class="school-name">${escapeHtml(paper.examName || "वार्षिक परीक्षा")}</div>
      <div class="exam-name">${escapeHtml(paper.paperTitle || "गणित प्रश्न पत्र")}</div>
    </div>
    <div class="paper-meta">
      <div class="paper-meta-left">
        ${paper.className ? `<span><strong>कक्षा:</strong> ${escapeHtml(paper.className)}</span>` : ""}
        <span><strong>विषय:</strong> ${escapeHtml(paper.subject || "गणित")}</span>
      </div>
      <div class="paper-meta-right">
        <span><strong>समय:</strong> ${escapeHtml(paper.timeAllowed || "3 घंटे")}</span>
        <span><strong>पूर्णांक:</strong> ${paper.maxMarks || 80}</span>
      </div>
    </div>
  `;

  // General instructions
  if (paper.generalInstructions && paper.generalInstructions.length > 0) {
    html += `
      <div class="paper-instructions">
        <h3>सामान्य निर्देश:</h3>
        <ol>
          ${paper.generalInstructions.map((inst) => `<li>${escapeHtml(inst)}</li>`).join("")}
        </ol>
      </div>
    `;
  }

  // Sections
  if (paper.sections) {
    paper.sections.forEach((section) => {
      html += `
        <div class="paper-section">
          <div class="section-header">
            <h3>${escapeHtml(section.name)}${section.title ? " — " + escapeHtml(section.title) : ""}</h3>
            ${section.instructions ? `<p>${escapeHtml(section.instructions)}</p>` : ""}
          </div>
      `;

      if (section.questions) {
        section.questions.forEach((q) => {
          html += `
            <div class="question">
              <div class="question-row">
                <span class="question-number">प्र. ${q.number}.</span>
                <div class="question-text">${formatMath(q.text)}</div>
                <span class="question-marks">${q.marks} अंक</span>
              </div>
          `;

          // MCQ options
          if (q.type === "mcq" && q.options && q.options.length > 0) {
            html += `<div class="mcq-options">`;
            q.options.forEach((opt, i) => {
              html += `
                <div class="mcq-option">
                  <span class="mcq-option-label">${optionLabels[i] || `(${i + 1})`}</span>
                  ${formatMath(opt)}
                </div>
              `;
            });
            html += `</div>`;
          }

          html += `</div>`;
        });
      }

      html += `</div>`;
    });
  }

  // Footer
  html += `
    <div style="text-align:center; margin-top:2rem; padding-top:1rem; border-top:2px solid #1a1a2e; font-weight:700; color:#6c5ce7;">
      ✦ शुभकामनाएँ ✦
    </div>
  `;

  // Answer Key Section (appended after all questions)
  const includeAnswersEl = document.getElementById("includeAnswers");
  const showAnswers = includeAnswersEl && includeAnswersEl.value === "yes";

  if (showAnswers && paper.sections) {
    let hasAnyAnswer = false;
    let answerHtml = `
      <div class="answer-key-section" style="margin-top:2.5rem; padding-top:1.5rem; border-top:3px double #333;">
        <div style="text-align:center; margin-bottom:1.5rem;">
          <h2 style="color:#1a1a2e; font-size:1.4rem; margin:0;">✦ उत्तर कुंजी (Answer Key) ✦</h2>
        </div>
    `;

    paper.sections.forEach((section) => {
      let sectionHasAnswers = false;
      let sectionAnswerHtml = `
        <div style="margin-bottom:1rem;">
          <h3 style="color:#2d3436; font-size:1.1rem; margin-bottom:0.5rem; border-bottom:1px solid #636e72; padding-bottom:0.3rem; font-weight:700;">
            ${escapeHtml(section.name)}${section.title ? " — " + escapeHtml(section.title) : ""}
          </h3>
      `;

      if (section.questions) {
        section.questions.forEach((q) => {
          if (q.answer) {
            sectionHasAnswers = true;
            hasAnyAnswer = true;
            sectionAnswerHtml += `
              <div style="margin-bottom:0.6rem; padding-left:0.5rem;">
                <strong style="color:#000;">प्र. ${q.number}:</strong>
                <span style="color:#2d3436; margin-left:0.3rem;">${formatMath(q.answer)}</span>
              </div>
            `;
          }
        });
      }

      sectionAnswerHtml += `</div>`;
      if (sectionHasAnswers) {
        answerHtml += sectionAnswerHtml;
      }
    });

    answerHtml += `</div>`;

    if (hasAnyAnswer) {
      html += answerHtml;
    }
  }

  paperContainer.innerHTML = html;

  // Render KaTeX
  setTimeout(() => {
    if (typeof renderMathInElement === "function") {
      renderMathInElement(paperContainer, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
        trust: true,
      });
    }
  }, 100);
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatMath(text) {
  if (!text) return "";
  // Escape HTML but preserve LaTeX delimiters
  let escaped = escapeHtml(text);
  // Restore LaTeX delimiters that got escaped
  escaped = escaped.replace(/\\\\?\(/g, "\\(");
  escaped = escaped.replace(/\\\\?\)/g, "\\)");
  escaped = escaped.replace(/\\\\?\[/g, "\\[");
  escaped = escaped.replace(/\\\\?\]/g, "\\]");
  // Restore backslashes for LaTeX commands
  escaped = escaped.replace(/\\\\([a-zA-Z]+)/g, "\\$1");
  return escaped;
}

// ======= SVG → IMAGE CONVERSION FOR PDF =======
// KaTeX renders sqrt/radical symbols as inline SVGs.
// html2canvas cannot capture these SVGs properly.
// This function converts them to PNG images before PDF export.
//
// KEY FIX: KaTeX radical SVGs use width="400em" (≈6400px).
// When serialized as standalone images, the radical symbol occupies
// only the leftmost few pixels of this huge width, becoming invisible
// when scaled down. We MUST override width/height with the actual
// visible (clipped) pixel dimensions from getBoundingClientRect().
// We also inline fill colors since SVGs lose CSS inheritance when serialized.
async function convertSvgsToImages(container) {
  const svgs = container.querySelectorAll("svg");
  const restoreActions = [];

  for (const svg of svgs) {
    try {
      const rect = svg.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;

      // Clone and prepare the SVG with proper namespace
      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // CRITICAL: Always force pixel dimensions matching the visible area.
      // KaTeX radical SVGs have width="400em" height="1.08em" etc.
      // When serialized to a standalone image, these em values resolve
      // to huge pixel widths (400em ≈ 6400px), causing drawImage to
      // scale the radical symbol down to sub-pixel size (invisible).
      // By forcing pixel values matching the clipped visible rect,
      // the radical renders at the correct size.
      clone.setAttribute("width", rect.width + "px");
      clone.setAttribute("height", rect.height + "px");

      // Inline fill/stroke colors on all shape elements.
      // When an SVG is serialized and rendered in isolation (data URL),
      // it loses CSS inheritance (color, fill from parent elements).
      // KaTeX SVG paths rely on inherited fill color from CSS.
      const computedStyle = window.getComputedStyle(svg);
      const fillColor = computedStyle.color || "#000000";

      clone.querySelectorAll("path, line, polyline, polygon, circle, rect, ellipse").forEach((el) => {
        const currentFill = el.getAttribute("fill");
        if (!currentFill || currentFill === "currentColor" || currentFill === "inherit" || currentFill === "") {
          el.setAttribute("fill", fillColor);
        }
        const currentStroke = el.getAttribute("stroke");
        if (currentStroke === "currentColor" || currentStroke === "inherit") {
          el.setAttribute("stroke", fillColor);
        }
      });

      // Set fill on root SVG element too
      if (!clone.getAttribute("fill") || clone.getAttribute("fill") === "currentColor") {
        clone.setAttribute("fill", fillColor);
      }

      // Serialize to a data URL (more reliable than Blob URLs for SVGs,
      // which some browsers restrict for security reasons)
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = "data:image/svg+xml;base64," + svgBase64;

      // Draw SVG onto a high-resolution canvas
      const canvas = document.createElement("canvas");
      const scale = 4; // higher resolution for crisp radical curves
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      ctx.drawImage(img, 0, 0, rect.width, rect.height);

      // Replace SVG with an <img> tag in the live DOM
      const imgEl = document.createElement("img");
      imgEl.src = canvas.toDataURL("image/png");
      imgEl.style.width = rect.width + "px";
      imgEl.style.height = rect.height + "px";
      imgEl.style.display = "inline-block";
      imgEl.style.verticalAlign = svg.style.verticalAlign || "middle";

      // Preserve position styling from the original SVG
      const svgPosition = computedStyle.position;
      if (svgPosition && svgPosition !== "static") {
        imgEl.style.position = svgPosition;
        imgEl.style.top = computedStyle.top;
        imgEl.style.left = computedStyle.left;
      }

      const parent = svg.parentNode;
      parent.replaceChild(imgEl, svg);

      // Store restore action to put original SVGs back after PDF export
      restoreActions.push(() => parent.replaceChild(svg, imgEl));
    } catch (e) {
      // Skip SVGs that fail to convert — log for debugging
      console.warn("SVG conversion failed for element:", svg, e);
    }
  }

  // Return a function that restores original SVGs
  return () => restoreActions.forEach((fn) => fn());
}

// ======= PDF DOWNLOAD =======
downloadBtn.addEventListener("click", async () => {
  downloadBtn.disabled = true;
  downloadBtn.textContent = "PDF बन रहा है...";

  let restoreSvgs = null;

  try {
    // Add the exporting class to remove max-height/overflow (uses !important in CSS)
    paperContainer.classList.add("exporting");
    paperContainer.scrollTop = 0;
    window.scrollTo(0, 0);

    // Wait for browser to reflow with expanded container
    await new Promise((r) => setTimeout(r, 300));

    // Convert KaTeX SVGs (sqrt symbols etc.) to images for html2canvas
    restoreSvgs = await convertSvgsToImages(paperContainer);

    // Wait a moment for images to settle
    await new Promise((r) => setTimeout(r, 200));

    const opt = {
      margin: [10, 12, 10, 12],
      filename: (() => {
        const subjectEl = document.getElementById("subject");
        const v = subjectEl ? subjectEl.value : "";
        if (v.includes("Physics") || v.includes("भौतिक")) return "भौतिक_विज्ञान_प्रश्न_पत्र.pdf";
        if (v.includes("Chemistry") || v.includes("रसायन")) return "रसायन_विज्ञान_प्रश्न_पत्र.pdf";
        return "गणित_प्रश्न_पत्र.pdf";
      })(),
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: paperContainer.scrollWidth,
        height: paperContainer.scrollHeight,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
      pagebreak: {
        mode: ["css", "legacy"],
        avoid: [".question", ".section-header", ".paper-instructions"],
      },
    };

    await html2pdf().set(opt).from(paperContainer).save();

    // Restore original SVGs and scrollable preview
    if (restoreSvgs) restoreSvgs();
    paperContainer.classList.remove("exporting");
  } catch (err) {
    if (restoreSvgs) restoreSvgs();
    paperContainer.classList.remove("exporting");
    alert("PDF बनाने में त्रुटि: " + err.message);
  }

  downloadBtn.disabled = false;
  downloadBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
    </svg>
    PDF डाउनलोड करें
  `;
});

// ======= INIT =======
showState("empty");
