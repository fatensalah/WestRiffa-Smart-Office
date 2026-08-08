async function renderDashboard() {

  const box = $("recentList");

  if (!box) {
    return;
  }


  try {

    let records = [];


    /* =====================================
       جلب البيانات من Supabase
       ===================================== */

    if (
      window.WRGraph &&
      typeof WRGraph.configured === "function" &&
      WRGraph.configured()
    ) {

      records =
        await WRGraph.fetchRecords();

    } else {

      records =
        typeof wrGetRecords === "function"
          ? wrGetRecords()
          : [];

    }


    records =
      Array.isArray(records)
        ? records
        : [];


    /* =====================================
       الإحصائيات الرئيسية
       ===================================== */

    $("statAll").textContent =
      records.length;


    $("statActivities").textContent =
      records.filter(
        r =>
          r.type === "activity"
      ).length;


    $("statMeetings").textContent =
      records.filter(
        r =>
          [
            "meeting",
            "invitation",
            "attendance",
            "recommendation"
          ].includes(r.type)
      ).length;


    $("statCertificates").textContent =
      records.filter(
        r =>
          r.type === "certificate"
      ).length;


    /* =====================================
       ترتيب السجلات من الأحدث
       ===================================== */

    records.sort(
      (a, b) => {

        const dateA =
          getRecordDate(a);

        const dateB =
          getRecordDate(b);

        return (
          dateB.getTime() -
          dateA.getTime()
        );

      }
    );


    /* =====================================
       أحدث العمليات
       ===================================== */

    box.innerHTML = "";


    if (!records.length) {

      box.innerHTML = `
        <div class="empty">
          لا توجد عمليات محفوظة بعد.
        </div>
      `;

      return;

    }


    records
      .slice(0, 6)
      .forEach(record => {

        const row =
          document.createElement("div");


        row.className =
          "recent-row";


        const title =
          getRecordTitle(record);


        const typeName =
          typeof wrTypeLabel === "function"
            ? wrTypeLabel(record.type)
            : record.type || "سجل";


        const dateText =
          formatRecordDate(record);


        const url =
          getRecordUrl(record);


        row.innerHTML = `

          <div>

            <strong>
              ${escapeDashboardHtml(title)}
            </strong>

            <div
              style="
                color:#6b7a72;
                font-size:13px;
                margin-top:4px
              "
            >
              ${escapeDashboardHtml(dateText)}
            </div>

          </div>


          <div
            style="
              display:flex;
              gap:8px;
              align-items:center;
              flex-wrap:wrap
            "
          >

            <span class="tag">
              ${escapeDashboardHtml(typeName)}
            </span>

            ${
              url
                ? `
                  <a
                    class="btn btn-soft"
                    href="${url}"
                    style="
                      padding:7px 11px;
                      font-size:12px
                    "
                  >
                    فتح
                  </a>
                `
                : ""
            }

          </div>

        `;


        box.appendChild(
          row
        );

      });


    console.log(
      "Dashboard loaded from Supabase:",
      records.length,
      records
    );


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );


    $("statAll").textContent =
      "0";


    $("statActivities").textContent =
      "0";


    $("statMeetings").textContent =
      "0";


    $("statCertificates").textContent =
      "0";


    box.innerHTML = `

      <div class="empty">

        تعذر تحميل السجلات.

        <br>

        تأكدي من تسجيل الدخول
        ثم أعيدي تحميل الصفحة.

      </div>

    `;

  }

}


/* =====================================
   عنوان السجل
   ===================================== */

function getRecordTitle(record) {

  return (
    record.title ||
    record.payload?.title ||
    record.payload?.name ||
    record.payload?.meetingTitle ||
    record.payload?.recommendationTitle ||
    record.payload?.beneficiaryName ||
    "بدون عنوان"
  );

}


/* =====================================
   تاريخ السجل
   ===================================== */

function getRecordDate(record) {

  const rawDate =
    record.created_at ||
    record.createdAt ||
    record.updated_at ||
    record.updatedAt ||
    record.record_date ||
    record.payload?.date ||
    record.payload?.dueDate;


  if (!rawDate) {

    return new Date(0);

  }


  const date =
    new Date(rawDate);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return new Date(0);

  }


  return date;

}


/* =====================================
   تنسيق التاريخ
   ===================================== */

function formatRecordDate(record) {

  const date =
    getRecordDate(record);


  if (
    date.getTime() === 0
  ) {

    return "—";

  }


  return date.toLocaleString(
    "ar-BH",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );

}


/* =====================================
   تحديد رابط فتح السجل
   ===================================== */

function getRecordUrl(record) {

  const id =
    encodeURIComponent(
      record.id
    );


  if (
    record.type === "activity"
  ) {

    return (
      "pages/activities/report.html?id=" +
      id
    );

  }


  if (
    record.type === "invitation"
  ) {

    return (
      "pages/meetings/invitation.html?id=" +
      id
    );

  }


  if (
    record.type === "meeting"
  ) {

    return (
      "pages/meetings/minutes.html?id=" +
      id
    );

  }


  if (
    record.type === "attendance"
  ) {

    return (
      "pages/meetings/attendance.html?id=" +
      id
    );

  }


  if (
    record.type === "recommendation"
  ) {

    return (
      "pages/meetings/recommendations.html?id=" +
      id
    );

  }


  if (
    record.type === "certificate"
  ) {

    return (
      "pages/certificates/create.html?id=" +
      id
    );

  }


  return "";

}


/* =====================================
   حماية النصوص
   ===================================== */

function escapeDashboardHtml(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =====================================
   تحديث تلقائي عند تغير السجلات
   ===================================== */

window.addEventListener(
  "wr-records-changed",
  renderDashboard
);


/* =====================================
   تشغيل لوحة التحكم
   ===================================== */

document.addEventListener(
  "DOMContentLoaded",
  renderDashboard
);