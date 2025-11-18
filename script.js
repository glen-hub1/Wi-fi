/* Load jsQR */
const qrScript = document.createElement("script");
qrScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
document.body.appendChild(qrScript);

/* Elements */
const preview = document.getElementById("preview");
const toggle = document.getElementById("themeToggle");

/* Dark Mode */
toggle.onclick = () => {
  document.body.classList.toggle("dark");
  toggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
};

/* Preview Uploaded Image */
document.getElementById("qrImage").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  preview.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
});

/* Load image from URL or file */
async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Decode QR */
async function decodeQR(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(data.data, canvas.width, canvas.height);
}

/* Extract WiFi Password */
function extractWiFi(text) {
  let pass = text.match(/P:(.*?);/);
  return pass ? pass[1] : null;
}

/* GENERATE BUTTON */
document.getElementById("generateBtn").addEventListener("click", async () => {
  const file = document.getElementById("qrImage").files[0];
  const url = document.getElementById("qrUrl").value.trim();

  const loading = document.getElementById("loading");
  const resultBox = document.getElementById("result");

  loading.classList.remove("hidden");
  resultBox.classList.add("hidden");

  let img;

  try {
    if (file) img = await loadImage(URL.createObjectURL(file));
    else if (url) img = await loadImage(url);
    else {
      alert("Please upload an image or paste a URL");
      loading.classList.add("hidden");
      return;
    }

    const qr = await decodeQR(img);
    if (!qr) {
      alert("Could not decode QR Code");
      loading.classList.add("hidden");
      return;
    }

    let text = qr.data;
    document.getElementById("content").textContent = "Decoded: " + text;

    let wifi = extractWiFi(text);
    if (wifi) {
      document.getElementById("wifiPassword").textContent = "Wi-Fi Password: " + wifi;
      document.getElementById("copyBtn").style.display = "block";
    } else {
      document.getElementById("wifiPassword").textContent = "⚠️ Not a Wi-Fi QR code";
      document.getElementById("copyBtn").style.display = "none";
    }

    resultBox.classList.remove("hidden");

  } catch (err) {
    alert("Error decoding QR");
  }

  loading.classList.add("hidden");
});

/* COPY BUTTON */
document.getElementById("copyBtn").addEventListener("click", () => {
  const pw = document.getElementById("wifiPassword").textContent.replace("Wi-Fi Password: ", "");
  navigator.clipboard.writeText(pw);
  alert("Copied!");
});
