# AI Fake Job & Internship Detector 🛡️

> Protect job seekers from fraudulent postings using AI-powered pattern analysis.

## 🚀 Live Demo
Deploy to Render and share the URL!

---

## 📁 Project Structure

```
├── app.py                  # Flask backend + AI scoring engine
├── requirements.txt        # Python dependencies
├── Procfile                # Render/Heroku process config
├── .python-version         # Python version pin
├── templates/
│   └── index.html          # Main UI page
└── static/
    ├── css/
    │   └── style.css       # Full stylesheet with animations
    └── js/
        └── main.js         # Frontend logic + gauge + particles
```

---

## 🧠 How the AI Detection Works

The scoring engine analyzes job postings across **7 dimensions**:

| Check | Weight |
|---|---|
| Red-flag keyword matching (50+ phrases) | Up to 40 pts |
| Suspicious phrases detection | Up to 24 pts |
| Personal email domain check | 15 pts |
| Job description length & quality | Up to 20 pts |
| Salary realism check | Up to 10 pts |
| Text quality (ALL CAPS, exclamation abuse) | Up to 15 pts |
| Legitimate signals (offset score) | −20 pts max |

**Risk Levels:**
- ✅ **0–20** → SAFE
- 🟡 **21–45** → LOW RISK  
- 🟠 **46–70** → SUSPICIOUS
- 🔴 **71–100** → HIGH RISK — LIKELY FAKE

---

## 🛠️ Run Locally

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py
# Open http://localhost:5000
```

---

## ☁️ Deploy to Render

1. **Push this project to a GitHub repository**

2. **Go to [render.com](https://render.com)** → New → Web Service

3. **Connect your GitHub repo**

4. **Configure the service:**
   - **Name:** `fake-job-detector` (or any name)
   - **Environment:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60`

5. **Click "Create Web Service"** — Render auto-deploys!

> ⚡ Render automatically sets the `PORT` environment variable.
> The `app.py` reads `os.environ.get("PORT", 5000)` so it works both locally and on Render.

---

## ✨ Features

- 🤖 AI-powered risk scoring (no external API needed)
- 🎨 Dark-mode UI with animated particles & floating elements
- 📊 Animated risk gauge with needle
- 🚩 Detailed red-flag breakdown
- ✅ Positive signal detection
- 💡 Personalized safety recommendations
- 📱 Fully responsive (mobile-friendly)
- 🆓 100% free — no data stored

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, Flask 3.0 |
| CORS | Flask-CORS |
| Server | Gunicorn (production) |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES2022) |
| Fonts | Google Fonts — Inter |
| Deployment | Render.com |

---

## 📄 License
MIT — Free to use and modify.
