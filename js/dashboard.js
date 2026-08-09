async function renderDashboard() {

  const recentBox = $("recentList");

  if (!recentBox) {
    return;
  }

  try {

    let records = [];
    let currentProfile = null;
    let allProfiles = [];


    /* =====================================
       المستخدم الحالي
       ===================================== */

    const user =
      await WRGraph.getAccount();


    if (!user) {
      throw new Error("لا يوجد مستخدم مسجل الدخول");
    }


    /* =====================================
       الاتصال بـ Supabase
       ===================================== */

    const sb =
      window.supabase.createClient(
        window.WR_CONFIG.supabaseUrl,
        window.WR_CONFIG.supabaseKey
      );


    /* =====================================
       Profile المستخدم الحالي
       ===================================== */

    const {
      data: profileData,
      error: profileError
    } = await sb
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();


    if (profileError) {
      console.warn(
        "تعذر تحميل Profile الحالي:",
        profileError
      );
    } else {
      currentProfile = profileData;
    }


    /* =====================================
       جلب السجلات
       RLS سيحدد ما يراه كل مستخدم
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
       لو Admin نجلب Profiles المعلمات
       ===================================== */

    if (
      currentProfile &&
      currentProfile.role === "admin"
    ) {

      const {
        data: profilesData,
        error: profilesError
      } = await sb
        .from("profiles")
        .select("id, full_name, role, created_at")
        .order("full_name", {
          ascending: true
        });


      if (profilesError) {

        console.error(
          "تعذر تحميل Profiles:",
          profilesError
        );

      } else {

        allProfiles =
          Array.isArray(profilesData)
            ? profilesData
            : [];

      }

    }


    /* =====================================
       الإحصائيات الرئيسية
       ===================================== */

    $("statAll").textContent =
      records.length;


    $("statActivities").textContent =
      records.filter(
        record =>
          record.type === "activity"
      ).length;


    $("statMeetings").textContent =
      records.filter(
        record =>
          [
            "meeting",
            "invitation",
            "attendance",
            "recommendation"
          ].includes(record.type)
      ).length;


    $("statCertificates").textContent =
      records.filter(
        record =>
          record.type === "certificate"
      ).length;


    /* =====================================
       نشاط المعلمات - Admin فقط
       ===================================== */

    renderTeacherActivity(
      records,
      currentProfile,
      allProfiles
    );


    /* =====================================
       ترتيب السجلات من الأحدث
       ===================================== */

    records.sort(
      (a, b) => {

        return (
          getRecordDate(b).getTime() -
          getRecordDate(a).getTime()
        );

      }
    );


    /* =====================================
       آخر العمليات
       ===================================== */

    recentBox.innerHTML =
      "";


    if (!records.length) {

      recentBox.innerHTML = `
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
                margin-top:4px;
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
              flex-wrap:wrap;
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
                      font-size:12px;
                    "
                  >
                    فتح
                  </a>
                `
                : ""
            }

          </div>

        `;


        recentBox.appendChild(
          row
        );

      });


    console.log(
      "Dashboard loaded:",
      {
        role:
          currentProfile?.role,

        records:
          records.length,

        profiles:
          allProfiles.length
      }
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


    recentBox.innerHTML = `

      <div class="empty">

        تعذر تحميل السجلات.

        <br>

        تأكدي من تسجيل الدخول
        ثم أعيدي تحميل الصفحة.

      </div>

    `;

  }

}



/* =========================================================
   نشاط المعلمات
   التجميع حسب created_by
   ========================================================= */

function renderTeacherActivity(
  records,
  currentProfile,
  profiles
) {

  const section =
    document.getElementById(
      "teacherActivitySection"
    );


  const listBox =
    document.getElementById(
      "teacherActivityList"
    );


  if (
    !section ||
    !listBox
  ) {
    return;
  }


  /* المعلمة لا ترى هذا القسم */

  if (
    !currentProfile ||
    currentProfile.role !== "admin"
  ) {

    section.style.display =
      "none";

    return;
  }


  section.style.display =
    "block";


  /* =====================================
     نحذف تفاصيل قديمة لو موجودة
     ===================================== */

  const oldDetails =
    document.getElementById(
      "teacherActivityDetails"
    );


  if (oldDetails) {
    oldDetails.remove();
  }


  /* =====================================
     حسابات Teacher فقط
     ===================================== */

  const teachers =
    (profiles || [])
      .filter(
        profile =>
          profile.role === "teacher"
      );


  listBox.innerHTML =
    "";


  if (!teachers.length) {

    listBox.innerHTML = `
      <div class="empty">
        لا توجد حسابات معلمات حتى الآن.
      </div>
    `;

    return;
  }


  /* =====================================
     بطاقة لكل معلمة
     ===================================== */

  teachers.forEach(
    teacher => {

      /*
        نجيب فعاليات هذه المعلمة
        من created_by الحقيقي
      */

      const teacherRecords =
        records.filter(
          record =>
            record.type === "activity" &&
            String(record.created_by) ===
            String(teacher.id)
        );


      teacherRecords.sort(
        (a, b) =>
          getRecordDate(b).getTime() -
          getRecordDate(a).getTime()
      );


      const count =
        teacherRecords.length;


      let latestText =
        "لا توجد فعاليات";


      if (count) {

        latestText =
          getRecordDate(
            teacherRecords[0]
          ).toLocaleDateString(
            "ar-BH",
            {
              year: "numeric",
              month: "short",
              day: "numeric"
            }
          );

      }


      const card =
        document.createElement(
          "button"
        );


      card.type =
        "button";


      card.style.cssText = `
        width:100%;
        border:1px solid #e2ebe6;
        background:#fff;
        border-radius:14px;
        padding:16px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:10px;
        box-shadow:0 3px 12px rgba(0,0,0,.04);
        text-align:right;
        font-family:inherit;
        cursor:pointer;
      `;


      card.innerHTML = `

        <div>

          <strong
            style="
              display:block;
              color:#075c40;
              font-size:16px;
            "
          >
            ${escapeDashboardHtml(
              teacher.full_name ||
              "معلمة"
            )}
          </strong>


          <div
            style="
              color:#6b7a72;
              font-size:12px;
              margin-top:5px;
            "
          >
            ${
              count
                ? `آخر فعالية: ${escapeDashboardHtml(latestText)}`
                : "لم تسجل فعاليات بعد"
            }
          </div>


          <div
            style="
              color:#8a9790;
              font-size:11px;
              margin-top:4px;
            "
          >
            اضغطي لعرض التقارير
          </div>

        </div>


        <div
          style="
            text-align:center;
            min-width:75px;
          "
        >

          <strong
            style="
              display:block;
              font-size:26px;
              color:#075c40;
            "
          >
            ${count}
          </strong>

          <span
            style="
              font-size:12px;
              color:#6b7a72;
            "
          >
            فعالية
          </span>

        </div>

      `;


      card.addEventListener(
        "click",
        () => {

          showTeacherReports(
            teacher,
            teacherRecords
          );

        }
      );


      listBox.appendChild(
        card
      );

    }
  );

}



/* =========================================================
   عرض تقارير معلمة واحدة
   ========================================================= */

function showTeacherReports(
  teacher,
  records
) {

  const section =
    document.getElementById(
      "teacherActivitySection"
    );


  if (!section) {
    return;
  }


  let details =
    document.getElementById(
      "teacherActivityDetails"
    );


  if (!details) {

    details =
      document.createElement(
        "div"
      );


    details.id =
      "teacherActivityDetails";


    details.style.cssText = `
      margin-top:18px;
      padding:18px;
      background:#f8faf9;
      border:1px solid #e1e9e5;
      border-radius:16px;
    `;


    section.appendChild(
      details
    );

  }


  details.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:14px;
      "
    >

      <div>

        <h3
          style="
            margin:0;
            color:#075c40;
          "
        >
          تقارير
          ${escapeDashboardHtml(
            teacher.full_name ||
            "المعلمة"
          )}
        </h3>

        <div
          style="
            margin-top:5px;
            color:#6b7a72;
            font-size:13px;
          "
        >
          عدد تقارير الفعاليات:
          ${records.length}
        </div>

      </div>


      <button
        id="closeTeacherDetails"
        type="button"
        class="btn btn-soft"
      >
        إغلاق
      </button>

    </div>


    <div
      id="teacherReportsList"
    ></div>

  `;


  const list =
    details.querySelector(
      "#teacherReportsList"
    );


  if (!records.length) {

    list.innerHTML = `

      <div class="empty">
        لم تسجل هذه المعلمة أي فعالية حتى الآن.
      </div>

    `;

  } else {

    records.forEach(
      record => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "recent-row";


        const title =
          getRecordTitle(record);


        const date =
          formatRecordDate(record);


        const url =
          getRecordUrl(record);


        row.innerHTML = `

          <div>

            <strong>
              ${escapeDashboardHtml(
                title
              )}
            </strong>

            <div
              style="
                color:#6b7a72;
                font-size:12px;
                margin-top:4px;
              "
            >
              ${escapeDashboardHtml(
                date
              )}
            </div>

          </div>


          <a
            class="btn btn-soft"
            href="${url}"
            style="
              padding:7px 11px;
              font-size:12px;
            "
          >
            فتح التقرير
          </a>

        `;


        list.appendChild(
          row
        );

      }
    );

  }


  details
    .querySelector(
      "#closeTeacherDetails"
    )
    .addEventListener(
      "click",
      () => {

        details.remove();

      }
    );


  details.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}



/* =========================================================
   عنوان السجل
   ========================================================= */

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



/* =========================================================
   تاريخ السجل
   ========================================================= */

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



/* =========================================================
   تنسيق التاريخ
   ========================================================= */

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



/* =========================================================
   رابط فتح السجل
   ========================================================= */

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



/* =========================================================
   حماية النصوص
   ========================================================= */

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



/* =========================================================
   تحديث عند تغير السجلات
   ========================================================= */

window.addEventListener(
  "wr-records-changed",
  renderDashboard
);



/* =========================================================
   تشغيل لوحة التحكم
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  renderDashboard
);