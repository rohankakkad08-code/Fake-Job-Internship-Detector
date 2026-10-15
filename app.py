from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import re
import math
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# ─── Red-flag keyword lists ───────────────────────────────────────────────────
RED_FLAG_KEYWORDS = [
    "no experience required", "work from home and earn", "earn money fast",
    "guaranteed income", "unlimited earning", "be your own boss",
    "no skills needed", "make money online", "earn $", "earn usd",
    "weekly pay", "daily pay", "upfront payment", "registration fee",
    "training fee", "pay to apply", "investment required", "processing fee",
    "wire transfer", "western union", "money gram", "bitcoin payment",
    "crypto payment", "100% commission", "passive income", "mlm",
    "multi-level marketing", "pyramid", "network marketing",
    "send us your bank details", "provide your ssn", "provide social security",
    "whatsapp only", "contact via telegram", "no interview", "immediate hire",
    "hired immediately", "urgently needed", "urgent hiring",
    "start immediately", "same day hiring", "no background check",
    "work from anywhere", "set your own schedule", "easy money",
    "get rich", "financial freedom", "dream job", "too good to be true",
    "government approved", "verified opportunity", "guaranteed job",
    "no degree required for high pay", "six-figure income", "secret technique"
]

SUSPICIOUS_PHRASES = [
    "must pay", "deposit required", "refundable deposit", "admin fee",
    "joining fee", "activation fee", "placement fee", "starter kit",
    "kit fee", "materials fee", "offshore position", "foreign contract",
    "visa sponsorship available immediately", "foreign national",
    "we found your resume online", "randomly selected",
    "you have been selected", "congratulations you have been chosen",
    "reply urgently", "limited slots", "first come first served",
    "no questions asked", "flexible ethics", "discreet work",
    "adult content", "personal assistant needed urgently"
]

LEGITIMATE_SIGNALS = [
    "equal opportunity employer", "background check required",
    "drug test required", "benefits package", "401k", "health insurance",
    "dental insurance", "vision insurance", "paid time off", "pto",
    "salary range", "compensation range", "job description",
    "responsibilities include", "qualifications", "requirements",
    "bachelor's degree", "master's degree", "years of experience",
    "team environment", "collaborative", "performance review",
    "career development", "professional development", "onboarding",
    "hr department", "human resources", "glassdoor", "linkedin",
    "indeed", "company website", "official email", "interview process"
]

SUSPICIOUS_EMAIL_DOMAINS = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "aol.com", "mail.com", "protonmail.com", "ymail.com",
    "live.com", "msn.com", "icloud.com"
]

# ─── Helper functions ─────────────────────────────────────────────────────────

def normalize(text: str) -> str:
    return text.lower().strip()


def count_matches(text: str, keyword_list: list) -> list:
    text_lower = normalize(text)
    found = []
    for kw in keyword_list:
        if kw.lower() in text_lower:
            found.append(kw)
    return found


def check_email_suspicious(email: str) -> bool:
    if not email:
        return False
    email = email.lower().strip()
    for domain in SUSPICIOUS_EMAIL_DOMAINS:
        if email.endswith("@" + domain):
            return True
    return False


def check_salary_unrealistic(salary: str) -> bool:
    if not salary:
        return False
    numbers = re.findall(r'\d[\d,]*', salary.replace(",", ""))
    for n in numbers:
        try:
            val = int(n)
            # Flag if monthly salary > 50000 or annual > 600000 with vague description
            if val > 50000 and val < 1000000:
                return True
        except ValueError:
            pass
    return False


def analyze_text_quality(text: str) -> dict:
    """Check for poor grammar signals."""
    issues = []
    sentences = text.split('.')
    avg_len = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)
    exclamation_count = text.count('!')
    caps_words = len(re.findall(r'\b[A-Z]{3,}\b', text))

    if exclamation_count > 5:
        issues.append(f"Excessive exclamation marks ({exclamation_count})")
    if caps_words > 8:
        issues.append(f"Excessive ALL-CAPS words ({caps_words})")
    if avg_len < 4:
        issues.append("Very short sentences (possible low-quality post)")

    return {"issues": issues, "exclamations": exclamation_count, "caps_words": caps_words}


def calculate_risk_score(data: dict) -> dict:
    """
    Core AI-style scoring engine.
    Returns a score 0-100 and a risk label.
    """
    score = 0
    flags = []
    positive_signals = []

    title = data.get("title", "")
    company = data.get("company", "")
    description = data.get("description", "")
    salary = data.get("salary", "")
    email = data.get("email", "")
    location = data.get("location", "")
    requirements = data.get("requirements", "")
    full_text = f"{title} {company} {description} {salary} {location} {requirements}"

    # ── Red-flag keywords ─────────────────────────────────────
    red_flags_found = count_matches(full_text, RED_FLAG_KEYWORDS)
    if red_flags_found:
        score += min(len(red_flags_found) * 8, 40)
        flags.extend([f'🚩 Red-flag phrase: "{kw}"' for kw in red_flags_found[:5]])

    # ── Suspicious phrases ────────────────────────────────────
    suspicious_found = count_matches(full_text, SUSPICIOUS_PHRASES)
    if suspicious_found:
        score += min(len(suspicious_found) * 6, 24)
        flags.extend([f'⚠️ Suspicious phrase: "{p}"' for p in suspicious_found[:4]])

    # ── Legitimate signals ────────────────────────────────────
    legit_found = count_matches(full_text, LEGITIMATE_SIGNALS)
    if legit_found:
        deduction = min(len(legit_found) * 4, 20)
        score = max(0, score - deduction)
        positive_signals.extend([f'✅ Legitimate signal: "{s}"' for s in legit_found[:4]])

    # ── Email domain check ────────────────────────────────────
    if check_email_suspicious(email):
        score += 15
        flags.append(f'📧 Personal email domain used ({email}) — legitimate companies use official domains')

    # ── Company name check ────────────────────────────────────
    if not company or len(company.strip()) < 2:
        score += 10
        flags.append("🏢 Company name missing or very short")
    elif any(w in company.lower() for w in ["pvt", "limited", "llc", "inc", "corp", "ltd"]):
        positive_signals.append("✅ Company has registered business suffix")

    # ── Description length ────────────────────────────────────
    desc_words = len(description.split())
    if desc_words < 30:
        score += 12
        flags.append(f"📝 Very short job description ({desc_words} words) — legitimate jobs are detailed")
    elif desc_words > 150:
        positive_signals.append("✅ Detailed job description provided")

    # ── Salary check ─────────────────────────────────────────
    if salary:
        if check_salary_unrealistic(salary):
            score += 10
            flags.append(f"💰 Unusually high salary claim: '{salary}'")
    else:
        score += 5
        flags.append("💵 No salary information provided")

    # ── Requirements section ──────────────────────────────────
    req_words = len(requirements.split())
    if req_words < 10:
        score += 8
        flags.append("📋 Requirements section is very sparse or missing")
    else:
        positive_signals.append("✅ Detailed requirements listed")

    # ── Text quality analysis ─────────────────────────────────
    quality = analyze_text_quality(full_text)
    if quality["issues"]:
        score += min(len(quality["issues"]) * 5, 15)
        flags.extend([f"✍️ {issue}" for issue in quality["issues"]])

    # ── Location vagueness ────────────────────────────────────
    if not location or location.lower() in ["anywhere", "worldwide", "global", "remote worldwide", ""]:
        score += 5
        flags.append("📍 Location is vague or unspecified")

    # ── Cap the score ─────────────────────────────────────────
    score = min(score, 100)

    # ── Risk label ────────────────────────────────────────────
    if score <= 20:
        risk_level = "SAFE"
        risk_color = "safe"
        risk_emoji = "✅"
        verdict = "This job posting appears legitimate and safe."
        recommendation = "You can proceed with caution. Verify the company independently before sharing personal information."
    elif score <= 45:
        risk_level = "LOW RISK"
        risk_color = "low"
        risk_emoji = "🟡"
        verdict = "This posting has a few minor concerns."
        recommendation = "Research the company thoroughly. Check reviews on LinkedIn/Glassdoor. Verify the contact email domain."
    elif score <= 70:
        risk_level = "SUSPICIOUS"
        risk_color = "medium"
        risk_emoji = "🟠"
        verdict = "Several red flags detected. This posting is likely suspicious."
        recommendation = "Proceed with extreme caution. Do NOT pay any fees. Verify the company's official website before applying."
    else:
        risk_level = "HIGH RISK — LIKELY FAKE"
        risk_color = "high"
        risk_emoji = "🔴"
        verdict = "Strong indicators of a fraudulent job posting!"
        recommendation = "DO NOT apply. DO NOT share personal or banking information. Report this posting to your local consumer protection authority."

    return {
        "score": score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "risk_emoji": risk_emoji,
        "verdict": verdict,
        "recommendation": recommendation,
        "flags": flags,
        "positive_signals": positive_signals,
        "total_red_flags": len(red_flags_found) + len(suspicious_found),
        "total_positive": len(legit_found),
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    result = calculate_risk_score(data)
    return jsonify(result)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "message": "AI Fake Job Detector API is running"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
