// script.js // QR decoding using jsQR library CDN

async function loadImage(url) { const img = new Image(); img.crossOrigin = "anonymous"; return new Promise((resolve, reject) => { img.onload = () => resolve(img); img.onerror = reject; img.src = url; }); }

async function decodeQRFromImage(img) { const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0); const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

return jsQR(imageData.data, canvas.width, canvas.height); }

function extractPassword(qrText) { // Format: WIFI:T:WPA;S:NetworkName;P:Password;; const match = qrText.match(/P:(.*?);/); return match ? match[1] : "Password not found"; }

document.getElementById("generateBtn").addEventListener("click", async () => { const fileInput = document.getElementById("qrImage").files[0]; const urlInput = document.getElementById("qrUrl").value.trim(); let img;

try { if (fileInput) { img = await loadImage(URL.createObjectURL(fileInput)); } else if (urlInput) { img = await loadImage(urlInput); } else { alert("Please upload an image or paste a URL."); return; }

const qrData = await decodeQRFromImage(img);

if (!qrData) {
  alert("Could not decode QR code.");
  return;
}

const password = extractPassword(qrData.data);

document.getElementById("password").textContent = password;
document.getElementById("result").classList.remove("hidden");

} catch (error) { alert("Error processing QR code."); console.error(error); } });

document.getElementById("copyBtn").addEventListener("click", () => { const password = document.getElementById("password").textContent; navigator.clipboard.writeText(password); alert("Password copied!"); });

// Load jsQR library const script = document.createElement('script'); script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js"; document.body.appendChild(script);
