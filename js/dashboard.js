async function renderDashboard() {

  const box = $("recentList");

  if (!box) {
    return;
  }

  try {

    let records = [];


    /* =====================================
       بيانات المستخدم الحالي
       ===================================== */

    let currentProfile = null;

    try {

      const user =
        await WRGraph.getAccount();

      if (user) {

        const sb =
          window.supabase.createClient(
            window.WR_CONFIG.supabaseUrl,
            window.WR_CONFIG.supabaseKey
          );

        const {
          data,
          error
        } = await sb
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", user.id)
          .single();

        if (!error) {
          currentProfile = data;
        }

      }

    } catch (profileError) {

      console.warn(
        "تعذر تحميل Profile:",
        profileError
      );

    }


    /* =====================================
       جلب السجلات من Supabase
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
       قسم نشاط المعلمات - Admin فقط
       ===================================== */

    renderTeacherActivity(
      records,
      currentProfile
    );


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
      "Dashboard loaded:",
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
   نشاط المعلمات
   Admin فقط
   ===================================== */

function renderTeacherActivity(
  records,
  profile
) {

  const section =
    document.getElementById(
      "teacherActivitySection"
    );

  const box =
    document.getElementById(
      "teacherActivityList"
    );


  if (
    !section ||
    !box
  ) {
    return;
  }


  /*
    المعلمة لا ترى هذا القسم إطلاقًا
  */

  if (
    !profile ||
    profile.role !== "admin"
  ) {

    section.style.display =
      "none";

    return;
  }


  section.style.display =
    "block";


  const activities =
    records.filter(
      record =>
        record.type === "activity"
    );


  const teachers = {};


  activities.forEach(
    record => {

      const payload =
        record.payload || {};


      const teacherName =
        payload.owner_name ||
        payload.executor ||
        record.executor ||
        "غير محدد";


      if (!teachers[teacherName]) {

        teachers[teacherName] = {
          name: teacherName,
          count: 0,
          latestDate: null
        };

      }


      teachers[teacherName].count++;


      const recordDate =
        getRecordDate(record);


      if (
        !teachers[teacherName].latestDate ||
        recordDate >
          teachers[teacherName].latestDate
      ) {

        teachers[teacherName].latestDate =
          recordDate;

      }

    }
  );


  const teacherList =
    Object.values(teachers)
      .sort(
        (a, b) =>
          b.count - a.count
      );


  box.innerHTML =
    "";


  if (!teacherList.length) {

    box.innerHTML = `
      <div class="empty">
        لا توجد تقارير فعاليات للمعلمات حتى الآن.
      </div>
    `;

    return;
  }


  teacherList.forEach(
    teacher => {

      const card =
        document.createElement(
          "div"
        );


      card.style.cssText = `
        background:#fff;
        border:1px solid #e2ebe6;
        border-radius:14px;
        padding:16px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:10px;
        box-shadow:0 3px 12px rgba(0,0,0,.04);
      `;


      let latest =
        "—";


      if (
        teacher.latestDate &&
        teacher.latestDate.getTime() !== 0
      ) {

        latest =
          teacher.latestDate
            .toLocaleDateString(
              "ar-BH",
              {
                year: "numeric",
                month: "short",
                day: "numeric"
              }
            );

      }


      card.innerHTML = `

        <div>

          <strong
            style="
              color:#075c40;
              font-size:16px
            "
          >
            ${escapeDashboardHtml(
              teacher.name
            )}
          </strong>

          <div
            style="
              color:#6b7a72;
              font-size:12px;
              margin-top:5px
            "
          >
            آخر فعالية:
            ${escapeDashboardHtml(
              latest
            )}
          </div>

        </div>


        <div
          style="
            text-align:center;
            min-width:75px
          "
        >

          <strong
            style="
              display:block;
              font-size:25px;
              color:#075c40
            "
          >
            ${teacher.count}
          </strong>

          <span
            style="
              font-size:12px;
              color:#6b7a72
            "
          >
            فعالية
          </span>

        </div>

      `;


      box.appendChild(
        card
      );

    }
  );

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
   تحديث تلقائي
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