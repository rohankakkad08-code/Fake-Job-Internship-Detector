/* ════════════════════════════════════════════════════════════
   AI Fake Job Detector — Main JavaScript
   ════════════════════════════════════════════════════════════ */

"use strict";

// ── Particle system ────────────────────────────────────────────────────────
(function initParticles() {
  const container = document.getElementById("bgParticles");
  if (!container) return;

  const colors = ["#4f8ef7", "#7c5cd8", "#ec4899", "#22c55e", "#f59e0b"];
  const COUNT = 28;

  for (let i = 0; i < COUNT; i++) {
    const dot = document.createElement("span");
    dot.className = "particle";
    const size = Math.random() * 5 + 2; // 2–7px
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 12;
    const duration = Math.random() * 10 + 8; // 8–18s

    dot.style.cssText = `
      width:${size}px; height:${size}px;
      left:${left}%;
      background:${color};
      animation-delay:${delay}s;
      animation-duration:${duration}s;
    `;
    container.appendChild(dot);
  }
})();

// ── Intersection Observer — scroll animations ──────────────────────────────
(function initScrollObserver() {
  const targets = document.querySelectorAll(".animate-on-scroll");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  targets.forEach((el) => observer.observe(el));
})();

// ── Counter animation (hero stats) ────────────────────────────────────────
(function initCounters() {
  const counters = document.querySelectorAll(".stat-number[data-target]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1600;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target).toLocaleString();
          if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
})();

// ── Word counter for description textarea ─────────────────────────────────
const descTextarea = document.getElementById("description");
const descCount = document.getElementById("descCount");

if (descTextarea && descCount) {
  descTextarea.addEventListener("input", () => {
    const words = descTextarea.value.trim()
      ? descTextarea.value.trim().split(/\s+/).length
      : 0;
    descCount.textContent = `${words} word${words !== 1 ? "s" : ""}`;
  });
}

// ── Clear button ───────────────────────────────────────────────────────────
const clearBtn = document.getElementById("clearBtn");
const jobForm = document.getElementById("jobForm");

if (clearBtn && jobForm) {
  clearBtn.addEventListener("click", () => {
    jobForm.reset();
    if (descCount) descCount.textContent = "0 words";
    showToast("Form cleared ✓");
  });
}

// ── Analyze-again button ───────────────────────────────────────────────────
const analyzeAgainBtn = document.getElementById("analyzeAgainBtn");
const resultsSection = document.getElementById("resultsSection");
const analyzerSection = document.getElementById("analyzerSection");

if (analyzeAgainBtn) {
  analyzeAgainBtn.addEventListener("click", () => {
    resultsSection.classList.add("hidden");
    analyzerSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ── Gauge helpers ─────────────────────────────────────────────────────────
function updateGauge(score) {
  const arc = document.getElementById("gaugeArc");
  const needle = document.getElementById("gaugeNeedle");
  const scoreEl = document.getElementById("gaugeScore");
  const labelEl = document.getElementById("gaugeLabel");

  if (!arc || !needle) return;

  // Arc total length ≈ 283px (half-circle r=90)
  const total = 283;
  const offset = total - (score / 100) * total;

  // Color gradient by score
  let color;
  if (score <= 20) color = "#22c55e";
  else if (score <= 45) color = "#f59e0b";
  else if (score <= 70) color = "#f97316";
  else color = "#ef4444";

  arc.style.strokeDashoffset = offset;
  arc.style.stroke = color;

  // Needle: rotate from -90° (0) to +90° (100)
  const angle = -90 + (score / 100) * 180;
  needle.style.transform = `rotate(${angle}deg)`;

  // Animate score counter
  const start = parseInt(scoreEl.textContent, 10) || 0;
  const duration = 1200;
  const startTime = performance.now();

  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    scoreEl.textContent = Math.round(start + eased * (score - start));
    if (p < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // Label
  if (score <= 20) labelEl.textContent = "Risk Score — Safe";
  else if (score <= 45) labelEl.textContent = "Risk Score — Low Risk";
  else if (score <= 70) labelEl.textContent = "Risk Score — Suspicious";
  else labelEl.textContent = "Risk Score — High Risk!";
}

// ── Render results ─────────────────────────────────────────────────────────
function renderResults(data) {
  // Show gauge
  updateGauge(data.score);

  // Verdict banner
  const banner = document.getElementById("verdictBanner");
  banner.className = `verdict-banner ${data.risk_color}`;
  document.getElementById("verdictEmoji").textContent = data.risk_emoji;
  document.getElementById("verdictRisk").textContent = data.risk_level;
  document.getElementById("verdictText").textContent = data.verdict;

  // Recommendation
  document.getElementById("recommendationText").textContent = data.recommendation;

  // Flags list
  const flagsList = document.getElementById("flagsList");
  flagsList.innerHTML = "";
  if (data.flags && data.flags.length) {
    data.flags.forEach((flag, i) => {
      const li = document.createElement("li");
      li.textContent = flag;
      li.style.animationDelay = `${i * 0.07}s`;
      flagsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No red flags detected.";
    li.className = "no-items";
    flagsList.appendChild(li);
  }

  // Signals list
  const signalsList = document.getElementById("signalsList");
  signalsList.innerHTML = "";
  if (data.positive_signals && data.positive_signals.length) {
    data.positive_signals.forEach((sig, i) => {
      const li = document.createElement("li");
      li.textContent = sig;
      li.style.animationDelay = `${i * 0.07}s`;
      signalsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No positive signals detected.";
    li.className = "no-items";
    signalsList.appendChild(li);
  }

  // Summary stats
  document.getElementById("totalFlags").textContent = data.total_red_flags || 0;
  document.getElementById("totalPositive").textContent = data.total_positive || 0;
  document.getElementById("riskScoreDisplay").textContent = data.score;

  // Show results
  resultsSection.classList.remove("hidden");
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ── Form submission ────────────────────────────────────────────────────────
const analyzeBtn = document.getElementById("analyzeBtn");
const btnText = analyzeBtn ? analyzeBtn.querySelector(".btn-text") : null;
const btnLoader = analyzeBtn ? analyzeBtn.querySelector(".btn-loader") : null;

function setLoading(loading) {
  if (!analyzeBtn) return;
  analyzeBtn.disabled = loading;
  if (loading) {
    btnText.classList.add("hidden");
    btnLoader.classList.remove("hidden");
  } else {
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
  }
}

if (jobForm) {
  jobForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!title) {
      showToast("⚠️ Please enter a Job Title.", "error");
      document.getElementById("title").focus();
      return;
    }
    if (!description) {
      showToast("⚠️ Please enter a Job Description.", "error");
      document.getElementById("description").focus();
      return;
    }

    const payload = {
      title,
      company:      document.getElementById("company").value.trim(),
      salary:       document.getElementById("salary").value.trim(),
      location:     document.getElementById("location").value.trim(),
      email:        document.getElementById("email").value.trim(),
      description,
      requirements: document.getElementById("requirements").value.trim(),
    };

    setLoading(true);

    try {
      const response = await fetch("/analyze", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Server error");
      }

      const data = await response.json();
      renderResults(data);
    } catch (err) {
      console.error(err);
      showToast(`❌ Analysis failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  });
}

// ── Toast utility ──────────────────────────────────────────────────────────
function showToast(message, type = "") {
  // Remove existing
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity .3s ease, transform .3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateX(40px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
