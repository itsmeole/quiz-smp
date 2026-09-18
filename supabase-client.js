// ══════════════════════════════════════════════════════════════════
// Supabase Client Helper for SMP Quiz
// ══════════════════════════════════════════════════════════════════

const SUPABASE_CONFIG = {
  url: "https://ljibgyeelxtpmpybzgts.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqaWJneWVlbHh0cG1weWJ6Z3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODM0ODksImV4cCI6MjEwNTI1OTQ4OX0.vt0cjoAzs94HO6hXpOgrtq7Ds1c6C02V_i0w_bn-Ubg",
  table: "quiz_results"
};

// Injeksi otomatis CSS badge status sinkronisasi
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.id = "supabase-sync-style";
  style.textContent = `
    .sync-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      border-radius: 24px;
      font-size: 13.5px;
      font-weight: 500;
      margin: 16px 0 8px;
      box-sizing: border-box;
      transition: all 0.25s ease;
    }
    .sync-badge.saving {
      background: #f1f3f5;
      color: #495057;
      border: 1px solid #ced4da;
    }
    .sync-badge.saved {
      background: var(--good-soft, #E8F4ED);
      color: var(--good, #1E7845);
      border: 1px solid rgba(30, 120, 69, 0.3);
    }
    .sync-badge.error {
      background: var(--bad-soft, #FAE9E5);
      color: var(--bad, #B03A25);
      border: 1px solid rgba(176, 58, 37, 0.3);
    }
    .sync-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      display: inline-block;
      animation: pulse-sync 1.2s infinite ease-in-out;
    }
    @keyframes pulse-sync {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.15); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Kirim hasil kuis langsung ke tabel quiz_results Supabase
 * @param {Object} data { student_name, student_class, subject, score, total_questions, percentage, violations }
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function saveQuizToSupabase(data) {
  const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}`;
  
  const payload = {
    student_name: data.student_name || "Tanpa Nama",
    student_class: data.student_class || "-",
    subject: data.subject || "Kuis",
    score: Number(data.score) || 0,
    total_questions: Number(data.total_questions) || 0,
    percentage: Number(Number(data.percentage).toFixed(2)) || 0,
    violations: Number(data.violations) || 0
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": "Bearer " + SUPABASE_CONFIG.anonKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gagal menyimpan ke Supabase:", response.status, errText);
      return { success: false, error: errText || ("Status " + response.status) };
    }

    return { success: true };
  } catch (err) {
    console.error("Kesalahan koneksi Supabase:", err);
    return { success: false, error: err.message || "Gagal menghubungi server" };
  }
}

/**
 * Menampilkan badge status sinkronisasi di tampilan hasil
 * @param {HTMLElement} targetEl Elemen container untuk badge
 * @param {Object} quizData Data kuis
 */
function displaySupabaseSyncStatus(targetEl, quizData) {
  if (!targetEl) return;

  targetEl.innerHTML = `
    <div id="sync-badge" class="sync-badge saving">
      <span class="sync-dot"></span>
      <span>Menyimpan nilai ke sistem...</span>
    </div>
  `;

  let hasSynced = false;

  const doSync = async () => {
    if (hasSynced) return;
    const badge = targetEl.querySelector("#sync-badge");
    if (badge) {
      badge.className = "sync-badge saving";
      badge.innerHTML = `<span class="sync-dot"></span><span>Menyimpan nilai ke database...</span>`;
    }

    const result = await saveQuizToSupabase(quizData);
    const updatedBadge = targetEl.querySelector("#sync-badge");
    if (!updatedBadge) return;

    if (result.success) {
      hasSynced = true;
      updatedBadge.className = "sync-badge saved";
      updatedBadge.innerHTML = `<span>✓ Nilai berhasil dikirim & tersimpan</span>`;
    } else {
      updatedBadge.className = "sync-badge error";
      updatedBadge.innerHTML = `
        <span>⚠️ Gagal menyimpan otomatis.</span>
        <button type="button" id="retry-sync-btn" style="margin-left:6px; background:none; border:none; color:inherit; text-decoration:underline; cursor:pointer; font-weight:600; font-size:12px;">Coba lagi</button>
      `;
      const retryBtn = targetEl.querySelector("#retry-sync-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", () => {
          hasSynced = false;
          doSync();
        });
      }
    }
  };

  doSync();
}

/**
 * Mengambil seluruh hasil kuis dari Supabase
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
async function fetchQuizResultsFromSupabase() {
  const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?select=*&order=created_at.desc`;
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": "Bearer " + SUPABASE_CONFIG.anonKey
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText || ("Status " + response.status) };
    }
    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || "Gagal menghubungi server" };
  }
}

/**
 * Menghapus satu data hasil kuis berdasarkan ID
 * @param {string} id UUID dari row quiz_results
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteQuizResultFromSupabase(id) {
  const endpoint = `${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.table}?id=eq.${id}`;
  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_CONFIG.anonKey,
        "Authorization": "Bearer " + SUPABASE_CONFIG.anonKey
      }
    });
    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: errText || ("Status " + response.status) };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Gagal menghubungi server" };
  }
}

// Pastikan fungsi dapat diakses secara global
if (typeof window !== "undefined") {
  window.saveQuizToSupabase = saveQuizToSupabase;
  window.displaySupabaseSyncStatus = displaySupabaseSyncStatus;
  window.fetchQuizResultsFromSupabase = fetchQuizResultsFromSupabase;
  window.deleteQuizResultFromSupabase = deleteQuizResultFromSupabase;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    saveQuizToSupabase,
    fetchQuizResultsFromSupabase,
    deleteQuizResultFromSupabase,
    SUPABASE_CONFIG
  };
}
