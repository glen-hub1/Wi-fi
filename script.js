/* script.js - robust, waits for jsQR, better errors and logs */

(() => {
  // Create and load jsQR library, return a promise that resolves when loaded
  function loadJsQR() {
    return new Promise((resolve, reject) => {
      if (window.jsQR) return resolve();
      const tag = document.createElement("script");
      tag.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
      tag.onload = () => {
        console.log("jsQR loaded");
        resolve();
      };
      tag.onerror = (e) => {
        console.error("Failed to load jsQR", e);
        reject(new Error("Failed to load jsQR library"));
      };
      document.head.appendChild(tag);
    });
  }

  // DOM helpers
  const preview = document.getElementById("preview");
  const toggle = document.getElementById("themeToggle");
  const fileInput = document.getElementById("qrImage");
  const urlInput = document.getElementById("qrUrl");
  const generateBtn = document.getElementById("generateBtn");
  const loadingEl = document.getElementById("loading");
  const resultBox = document.getElementById("result");
  const contentEl = document.getElementById("content");
  const wifiEl = document.getElementById("wifiPassword");
  const copyBtn = document.getElementById("copyBtn");

  // Theme toggle
  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    toggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

  // Show preview when user selects file
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      preview.classList.add("hidden");
      preview.src = "";
      return;
    }
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  });

  // Utility: load image from blob/url (returns HTMLImageElement)
  async function loadImageElement(src, isBlob=false) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // For external urls, try to request crossOrigin anonymous (may fail if server blocks)
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      if (isBlob) {
        img.src = src; // objectURL or blob url
      } else {
        img.src = src;
      }
    });
  }

  // If user supplies a remote URL, attempt to fetch as blob to avoid tainted canvas (may still be blocked)
  async function fetchImageAsObjectURL(remoteUrl) {
    try {
      const resp = await fetch(remoteUrl, { mode: "cors" });
      if (!resp.ok) throw new Error("Network response not ok: " + resp.status);
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn("fetchImageAsObjectURL failed:", err);
      // fallback: return original URL (may be CORS-tainted)
      return remoteUrl;
    }
  }

  // Decode QR using jsQR
  function decodeImageWithJsQR(img) {
    // create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    // Limit max size to avoid very large canvases on mobile which may throw
    const MAX_SIDE = 1200; // reduce memory pressure
    let w = img.width;
    let h = img.height;

    if (Math.max(w, h) > MAX_SIDE) {
      const ratio = MAX_SIDE / Math.max(w, h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      return code; // either null or object {data, ...}
    } catch (err) {
      // canvas getImageData can throw if CORS tainted or other problems
      console.error("getImageData failed (CORS or other):", err);
      throw err;
    }
  }

  // Extract Wi-Fi password from WIFI:... format
  function extractWiFiPassword(text) {
    const match = text.match(/P:([^;]*);/i);
    return match ? match[1] : null;
  }

  // UI helpers
  function showLoading(show = true) {
    if (show) {
      loadingEl.classList.remove("hidden");
      generateBtn.disabled = true;
    } else {
      loadingEl.classList.add("hidden");
      generateBtn.disabled = false;
    }
  }
  function showResult(decodedText, wifiPass) {
    contentEl.textContent = decodedText || "";
    if (wifiPass) {
      wifiEl.textContent = "Wi-Fi Password: " + wifiPass;
      copyBtn.style.display = "block";
      copyBtn.classList.remove("hidden");
    } else {
      wifiEl.textContent = "⚠️ Not a Wi-Fi QR code";
      copyBtn.style.display = "none";
      copyBtn.classList.add("hidden");
    }
    resultBox.classList.remove("hidden");
  }

  // Copy to clipboard
  copyBtn.addEventListener("click", () => {
    const pw = wifiEl.textContent.replace("Wi-Fi Password: ", "").trim();
    if (!pw) return alert("No password to copy");
    navigator.clipboard.writeText(pw).then(() => alert("Copied!"), (e) => {
      console.error("Copy failed", e);
      alert("Copy failed");
    });
  });

  // Main handler
  async function handleGenerate() {
    showLoading(true);
    resultBox.classList.add("hidden");
    contentEl.textContent = "";
    wifiEl.textContent = "";
    copyBtn.style.display = "none";

    try {
      // Ensure jsQR is loaded
      await loadJsQR();

      // Select image source
      const file = fileInput.files && fileInput.files[0];
      const url = urlInput.value && urlInput.value.trim();

      if (!file && !url) {
        alert("Please upload an image or paste a URL.");
        showLoading(false);
        return;
      }

      let imgSrc; // string to pass to loadImageElement
      let isBlob = false;

      if (file) {
        imgSrc = URL.createObjectURL(file);
        isBlob = true;
      } else {
        // remote URL: try to fetch as blob to avoid crossOrigin issues
        imgSrc = await fetchImageAsObjectURL(url);
        isBlob = true; // if fetch succeeded we returned objectURL; if not, we will try with original url which may be tainted
      }

      // load image element
      let img;
      try {
        img = await loadImageElement(imgSrc, isBlob);
      } catch (imgErr) {
        console.error("Image load failed:", imgErr);
        alert("Failed to load image. Check the URL or use file upload.");
        showLoading(false);
        return;
      }

      // attempt decode
      let qr;
      try {
        qr = decodeImageWithJsQR(img);
      } catch (decodeErr) {
        // decodeImageWithJsQR already logged the error (likely CORS or getImageData issue)
        alert("Error decoding QR (see console). If using a remote image, try uploading the file instead.");
        showLoading(false);
        return;
      }

      if (!qr) {
        alert("Could not decode QR code. Try a clearer image or upload the file directly.");
        showLoading(false);
        return;
      }

      const decodedText = qr.data;
      console.log("Decoded QR text:", decodedText);

      const wifiPass = extractWiFiPassword(decodedText);
      showResult(decodedText, wifiPass);

    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Unexpected error (see console).");
    } finally {
      showLoading(false);
    }
  }

  // Wire button
  generateBtn.addEventListener("click", handleGenerate);

  // helpful console tips for debugging when the user reports problems
  console.log("script.js ready — waiting for user interaction");
})();
