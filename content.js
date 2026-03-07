// ============================================================
// content.js — PERSON A's TERRITORY
// This script runs on every webpage. It finds images, adds
// shield icons, and shows the analysis tooltip when clicked.
// ============================================================

// ----------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------
const CONFIG = {
  minImageWidth: 200, // Only scan images larger than this (pixels)
  minImageHeight: 200,
  scanInterval: 2000, // Re-scan for new images every 2 seconds
};

// Keep track of images we've already processed
const processedImages = new Set();

// Cache analysis results so we don't re-analyze the same image
const analysisCache = new Map();

// ----------------------------------------------------------
// MAIN: Scan the page for images and add shield overlays
// ----------------------------------------------------------
function scanForImages() {
  const images = document.querySelectorAll("img");

  images.forEach((img) => {
    // Skip if already processed, too small, or no source
    if (processedImages.has(img)) return;
    if (!img.src && !img.currentSrc) return;
    if (img.naturalWidth < CONFIG.minImageWidth) return;
    if (img.naturalHeight < CONFIG.minImageHeight) return;

    // Mark as processed so we don't add duplicate shields
    processedImages.add(img);
    addShieldOverlay(img);
  });
}

// ----------------------------------------------------------
// SHIELD OVERLAY
// Adds a small clickable shield icon to the corner of an image
// ----------------------------------------------------------
function addShieldOverlay(img) {
  // We need the image's parent to be positioned for the overlay
  const parent = img.parentElement;
  if (!parent) return;

  // Make parent position relative if it isn't already
  const parentPosition = window.getComputedStyle(parent).position;
  if (parentPosition === "static") {
    parent.style.position = "relative";
  }

  // Create the shield button
  const shield = document.createElement("button");
  shield.className = "aig-shield-button";
  shield.innerHTML = "🛡️";
  shield.title = "Click to check if this image might be AI-generated";
  shield.setAttribute("aria-label", "Check image for AI generation");

  // Position it at the top-right corner of the image
  shield.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleShieldClick(img, shield);
  });

  parent.appendChild(shield);
}

// ----------------------------------------------------------
// HANDLE SHIELD CLICK
// Sends the image to background.js for analysis and shows results
// ----------------------------------------------------------
async function handleShieldClick(img, shield) {
  const imageUrl = img.currentSrc || img.src;

  // Close any existing tooltips first
  closeAllTooltips();

  // Show loading state
  const tooltip = createTooltip(shield);
  tooltip.innerHTML = `
    <div class="aig-tooltip-content">
      <div class="aig-loading">Checking this picture...</div>
    </div>
  `;

  // Check cache first
  if (analysisCache.has(imageUrl)) {
    showResults(tooltip, analysisCache.get(imageUrl));
    return;
  }

  // Send to background script for analysis
  try {
    const result = await chrome.runtime.sendMessage({
      action: "analyze",
      imageUrl: imageUrl,
    });

    // Cache the result
    analysisCache.set(imageUrl, result);
    showResults(tooltip, result);
  } catch (error) {
    console.error("AI Image Guard: Analysis failed", error);
    tooltip.innerHTML = `
      <div class="aig-tooltip-content">
        <div class="aig-error">Sorry, could not check this image right now.</div>
      </div>
    `;
  }
}

// ----------------------------------------------------------
// TOOLTIP CREATION AND DISPLAY
// Person A: This is where you make things look good for elders!
// ----------------------------------------------------------
function createTooltip(anchorElement) {
  const tooltip = document.createElement("div");
  tooltip.className = "aig-tooltip";

  // Position near the shield button
  anchorElement.parentElement.appendChild(tooltip);
  return tooltip;
}

function showResults(tooltip, result) {
  const { score, level, label, reasons } = result;

  // Build the reasons list
  const reasonsHtml = reasons
    .map((r) => `<li>${r}</li>`)
    .join("");

  tooltip.innerHTML = `
    <div class="aig-tooltip-content aig-level-${level}">
      <div class="aig-tooltip-header">
        <span class="aig-traffic-light aig-light-${level}"></span>
        <span class="aig-label">${label}</span>
        <button class="aig-close-btn" aria-label="Close">&times;</button>
      </div>

      ${
        reasons.length > 0
          ? `<div class="aig-reasons">
              <p class="aig-reasons-title">Why we think this:</p>
              <ul>${reasonsHtml}</ul>
            </div>`
          : ""
      }

      <div class="aig-actions">
        <button class="aig-btn aig-btn-speak" aria-label="Read aloud">
          🔊 Read Aloud
        </button>
        <button class="aig-btn aig-btn-search" aria-label="Search on Google">
          🔍 Check on Google
        </button>
      </div>

      <div class="aig-score-bar">
        <div class="aig-score-fill" style="width: ${score}%"></div>
      </div>
      <div class="aig-score-text">AI likelihood score: ${score}/100</div>
    </div>
  `;

  // --- CLOSE BUTTON ---
  tooltip.querySelector(".aig-close-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    tooltip.remove();
  });

  // --- READ ALOUD BUTTON (uses built-in browser TTS) ---
  tooltip.querySelector(".aig-btn-speak").addEventListener("click", (e) => {
    e.stopPropagation();
    speakAloud(label, reasons);
  });

  // --- CHECK ON GOOGLE BUTTON (reverse image search) ---
  tooltip.querySelector(".aig-btn-search").addEventListener("click", (e) => {
    e.stopPropagation();
    const img = tooltip.closest("[style]")?.querySelector("img");
    const imageUrl = img?.currentSrc || img?.src || "";
    if (imageUrl) {
      window.open(
        `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
        "_blank"
      );
    }
  });
}

// ----------------------------------------------------------
// TEXT-TO-SPEECH (built-in, no API key needed!)
// ----------------------------------------------------------
function speakAloud(label, reasons) {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  let text = label + ". ";
  if (reasons.length > 0) {
    text += "Here is why. " + reasons.join(". ") + ".";
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85; // Slightly slower for elders
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  utterance.lang = "en-US";

  window.speechSynthesis.speak(utterance);
}

// ----------------------------------------------------------
// UTILITY FUNCTIONS
// ----------------------------------------------------------
function closeAllTooltips() {
  document.querySelectorAll(".aig-tooltip").forEach((t) => t.remove());
}

// Close tooltips when clicking elsewhere on the page
document.addEventListener("click", (e) => {
  if (!e.target.closest(".aig-tooltip") && !e.target.closest(".aig-shield-button")) {
    closeAllTooltips();
  }
});

// ----------------------------------------------------------
// START SCANNING
// Run once immediately, then watch for dynamically loaded images
// ----------------------------------------------------------
scanForImages();

// MutationObserver watches for new images added to the page
// (important for sites that load content as you scroll)
const observer = new MutationObserver(() => {
  scanForImages();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Also re-scan periodically as a safety net
setInterval(scanForImages, CONFIG.scanInterval);

console.log("AI Image Guard — content script loaded");
