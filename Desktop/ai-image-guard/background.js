// ============================================================
// background.js — PERSON B's TERRITORY
// This is the service worker that runs behind the scenes.
// It receives image URLs from the content script, analyzes
// them, and sends back a score + reasons.
// ============================================================

// ----------------------------------------------------------
// MESSAGE LISTENER
// This is how the content script (Person A) talks to us.
// We receive a message, run our analysis, and send back results.
// ----------------------------------------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "analyze") {
    analyzeImage(message.imageUrl)
      .then((result) => sendResponse(result))
      .catch((error) => {
        console.error("Analysis failed:", error);
        sendResponse({
          score: -1,
          level: "unknown",
          label: "Could not check this image",
          reasons: ["Analysis failed — try again later"],
        });
      });

    // Return true to tell Chrome we'll respond asynchronously
    return true;
  }
});

// ----------------------------------------------------------
// MAIN ANALYSIS FUNCTION
// Person B: This is where you build out the detection logic.
// Right now it runs basic heuristic checks. You can add:
//   - EXIF metadata analysis
//   - C2PA content credential checks
//   - Domain reputation scoring
//   - API calls to Hive/SightEngine/etc.
// ----------------------------------------------------------
async function analyzeImage(imageUrl) {
  const reasons = [];
  let score = 50; // Start neutral

  // --- CHECK 1: Image source domain ---
  const domainResult = checkDomainReputation(imageUrl);
  score += domainResult.scoreAdjust;
  if (domainResult.reason) reasons.push(domainResult.reason);

  // --- CHECK 2: URL pattern heuristics ---
  const urlResult = checkUrlPatterns(imageUrl);
  score += urlResult.scoreAdjust;
  if (urlResult.reason) reasons.push(urlResult.reason);

  // --- CHECK 3: Fetch image and check metadata ---
  try {
    const metadataResult = await checkImageMetadata(imageUrl);
    score += metadataResult.scoreAdjust;
    if (metadataResult.reason) reasons.push(metadataResult.reason);
  } catch (e) {
    reasons.push("Could not read image details");
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Convert score to a simple traffic-light level
  const { level, label } = getTrafficLight(score);

  return { score, level, label, reasons };
}

// ----------------------------------------------------------
// HEURISTIC CHECKS
// Person B: Expand these! Add more domains, smarter patterns,
// and eventually real API calls.
// ----------------------------------------------------------

function checkDomainReputation(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const hostname = url.hostname.toLowerCase();

    // Trusted news/photo sources (expand this list!)
    const trustedDomains = [
      "reuters.com",
      "apnews.com",
      "gettyimages.com",
      "bbc.co.uk",
      "nytimes.com",
      "washingtonpost.com",
      "npr.org",
    ];

    // Known AI image generators (expand this list!)
    const aiDomains = [
      "dall-e",
      "midjourney",
      "stability.ai",
      "openai.com",
      "leonardo.ai",
      "playground.ai",
    ];

    if (trustedDomains.some((d) => hostname.includes(d))) {
      return {
        scoreAdjust: -20,
        reason: "Image is from a trusted news source",
      };
    }

    if (aiDomains.some((d) => hostname.includes(d))) {
      return {
        scoreAdjust: +30,
        reason: "Image is from a known AI image website",
      };
    }
  } catch (e) {
    // Invalid URL, skip this check
  }

  return { scoreAdjust: 0, reason: null };
}

function checkUrlPatterns(imageUrl) {
  const url = imageUrl.toLowerCase();

  // AI-related keywords in the URL
  const aiKeywords = [
    "ai-generated",
    "dall-e",
    "midjourney",
    "stable-diffusion",
    "generated",
    "synthetic",
  ];

  for (const keyword of aiKeywords) {
    if (url.includes(keyword)) {
      return {
        scoreAdjust: +25,
        reason: `The image link contains "${keyword}"`,
      };
    }
  }

  return { scoreAdjust: 0, reason: null };
}

async function checkImageMetadata(imageUrl) {
  // Try to fetch the image headers (not the full image)
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    const contentType = response.headers.get("content-type") || "";
    const contentLength = parseInt(
      response.headers.get("content-length") || "0"
    );

    // Very large, perfectly-sized images are sometimes AI-generated
    // (AI tools often output at exact resolutions like 1024x1024)
    if (contentLength > 2_000_000) {
      return {
        scoreAdjust: +5,
        reason: "This is a very large image file",
      };
    }

    // WebP format is common from AI generators
    if (contentType.includes("webp")) {
      return {
        scoreAdjust: +5,
        reason: "Image uses WebP format (common with AI tools)",
      };
    }
  } catch (e) {
    // CORS may block this — that's okay
    throw e;
  }

  return { scoreAdjust: 0, reason: null };
}

// ----------------------------------------------------------
// TRAFFIC LIGHT SCORING
// Converts a 0-100 score into elder-friendly labels
// ----------------------------------------------------------
function getTrafficLight(score) {
  if (score <= 35) {
    return { level: "green", label: "This picture looks real" };
  } else if (score <= 65) {
    return { level: "yellow", label: "Not sure about this picture" };
  } else {
    return {
      level: "red",
      label: "Be careful — this might be made by a computer",
    };
  }
}

console.log("AI Image Guard — background service worker loaded");
