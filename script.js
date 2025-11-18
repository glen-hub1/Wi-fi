/* Load jsQR */
let jsQRready = false;

const qrScript = document.createElement("script");
qrScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
qrScript.onload = () => {
  jsQRready = true;
  console.log("jsQR Loaded Successfully");
};
qrScript.onerror = () => alert("Failed to load jsQR library!");
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

/* Load image */
async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject("Could not load image.");
    img.src = src;
  });
}

/* Decode QR */
function decodeQR(img) {
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

/* MAIN BUTTON */
document.getElementById("generateBtn").addEventListener("click", async () => {
  if (!jsQRready) {
    alert("⚠️ QR library still loading... wait 1 second");
    return;
  }

  const loading = document.getElementById("loading");
  const resultBox = document.getElementById("result");
  loading.classList.remove("hidden");
  resultBox.classList.add("hidden");

  try {
    let img;
    const file = document.getElementById("qrImage").files[0];
    const url = document.getElementById("qrUrl").value.trim();

    if (file) img = await loadImage(URL.createObjectURL(file));
    else if (url) img = await loadImage(url);
    else {
      alert("Please upload an image or paste a QR URL");
      loading.classList.add("hidden");
      return;
    }

    const qr = decodeQR(img);

    if (!qr) {
      alert("❌ QR not detected in image");
      loading.classList.add("hidden");
      return;
    }

    const text = qr.data;
    document.getElementById("content").textContent = "Decoded: " + text;

    const wifi = extractWiFi(text);

    if (wifi) {
      document.getElementById("wifiPassword").textContent =
        "Wi-Fi Password: " + wifi;
      document.getElementById("copyBtn").style.display = "block";
    } else {
      document.getElementById("wifiPassword").textContent =
        "⚠️ Not a Wi-Fi QR code";
      document.getElementById("copyBtn").style.display = "none";
    }

    resultBox.classList.remove("hidden");
  } catch (err) {
    alert("Error decoding QR");
  }

  loading.classList.add("hidden");
});

/* Copy Password */
document.getElementById("copyBtn").addEventListener("click", () => {
  const pw = document.getElementById("wifiPassword")
    .textContent.replace("Wi-Fi Password: ", "");
  navigator.clipboard.writeText(pw);
  alert("Copied!");
});
