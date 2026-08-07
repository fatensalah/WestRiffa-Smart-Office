async function renderDashboard() {
  const box = $("recentList");

  try {
    let records = [];

    // نقرأ مباشرة من Supabase
    if (
      window.WRGraph &&
      typeof WRGraph.configured === "function" &&
      WRGraph.configured()
    ) {
      records = await WRGraph.fetchRecords();
    } else {
      // fallback محلي فقط لو Supabase غير متاح
      records = typeof wrGetRecords === "function"
        ? wrGetRecords()
        : [];
    }

    records = Array.isArray(records) ? records : [];

    // الإحصائيات
    $("statAll").textContent = records.length;

    $("statActivities").textContent =
      records.filter(r => r.type === "activity").length;

    $("statMeetings").textContent =
      records.filter(r =>
        ["meeting", "invitation", "attendance", "recommendation"]
          .includes(r.type)
      ).length;

    $("statCertificates").textContent =
      records.filter(r => r.type === "certificate").length;

    // أحدث السجلات
    box.innerHTML = "";

    if (!records.length) {
      box.innerHTML =
        '<div class="empty">لا توجد عمليات محفوظة بعد.</div>';
      return;
    }

    records.sort((a, b) => {
      const da = new Date(
        a.created_at ||
        a.createdAt ||
        a.record_date ||
        (a.payload && a.payload.date) ||
        0
      );

      const db = new Date(
        b.created_at ||
        b.createdAt ||
        b.record_date ||
        (b.payload && b.payload.date) ||
        0
      );

      return db - da;
    });

    records.slice(0, 6).forEach(r => {
      const row = document.createElement("div");
      row.className = "recent-row";

      const title =
        r.title ||
        (r.payload && (r.payload.title || r.payload.name)) ||
        "بدون عنوان";

      const rawDate =
        r.created_at ||
        r.createdAt ||
        r.record_date ||
        (r.payload && r.payload.date);

      let dateText = "—";

      if (rawDate) {
        const d = new Date(rawDate);

        if (!isNaN(d.getTime())) {
          dateText = d.toLocaleString("ar-BH");
        }
      }

      row.innerHTML = `
        <div>
          <strong>${title}</strong>
          <div style="color:#6b7a72;font-size:13px;margin-top:4px">
            ${dateText}
          </div>
        </div>
        <span class="tag">
          ${typeof wrTypeLabel === "function"
            ? wrTypeLabel(r.type)
            : (r.type || "سجل")}
        </span>
      `;

      box.appendChild(row);
    });

    console.log(
      "Dashboard loaded from Supabase:",
      records.length,
      records
    );

  } catch (error) {
    console.error("Dashboard error:", error);

    $("statAll").textContent = "0";
    $("statActivities").textContent = "0";
    $("statMeetings").textContent = "0";
    $("statCertificates").textContent = "0";

    box.innerHTML = `
      <div class="empty">
        تعذر تحميل السجلات. تأكدي من تسجيل الدخول ثم أعيدي تحميل الصفحة.
      </div>
    `;
  }
}

window.addEventListener(
  "wr-records-changed",
  renderDashboard
);

document.addEventListener(
  "DOMContentLoaded",
  renderDashboard
);