/* =========================================================
   WestRiffa Smart Office
   Dashboard
   ========================================================= */

let dashboardRecords = [];
let dashboardCurrentProfile = null;
let dashboardProfiles = [];


/* =========================================================
   تشغيل لوحة التحكم
   ========================================================= */

async function renderDashboard() {

  const recentBox =
    document.getElementById("recentList");

  if (!recentBox) return;


  try {

    let records = [];
    let currentProfile = null;
    let allProfiles = [];


    /* ===============================
       المستخدم الحالي
       =============================== */

    const user =
      await WRGraph.getAccount();


    if (!user) {
      throw new Error(
        "لا يوجد مستخدم مسجل الدخول"
      );
    }


    /* ===============================
       Supabase
       =============================== */

    const sb =
      window.supabase.createClient(
        window.WR_CONFIG.supabaseUrl,
        window.WR_CONFIG.supabaseKey
      );


    /* ===============================
       Profile المستخدم
       =============================== */

    const {
      data: profileData,
      error: profileError
    } = await sb
      .from("profiles")
      .select(
        "id, full_name, role"
      )
      .eq(
        "id",
        user.id
      )
      .single();


    if (profileError) {

      console.warn(
        "Profile error:",
        profileError
      );

    } else {

      currentProfile =
        profileData;

    }


    /* ===============================
       السجلات
       =============================== */

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


    /* ===============================
       حسابات المعلمات — Admin فقط
       =============================== */

    if (
      currentProfile &&
      currentProfile.role === "admin"
    ) {

      const {
        data: profilesData,
        error: profilesError
      } = await sb
        .from("profiles")
        .select(
          "id, full_name, role, created_at"
        )
        .order(
          "full_name",
          {
            ascending: true
          }
        );


      if (profilesError) {

        console.error(
          "Profiles error:",
          profilesError
        );

      } else {

        allProfiles =
          Array.isArray(profilesData)
            ? profilesData
            : [];

      }

    }


    dashboardRecords =
      records;

    dashboardCurrentProfile =
      currentProfile;

    dashboardProfiles =
      allProfiles;


    /* ===============================
       الإحصائيات الرئيسية
       =============================== */

    setDashboardText(
      "statAll",
      records.length
    );


    const activities =
      records.filter(
        record =>
          record.type === "activity"
      );


    setDashboardText(
      "statActivities",
      activities.length
    );


    setDashboardText(
      "statMeetings",
      records.filter(
        record =>
          [
            "meeting",
            "invitation",
            "attendance",
            "recommendation"
          ].includes(record.type)
      ).length
    );


    setDashboardText(
      "statCertificates",
      records.filter(
        record =>
          record.type === "certificate"
      ).length
    );


    /* ===============================
       المؤشرات الإدارية
       =============================== */

    renderAdminInsights(
      records,
      currentProfile
    );


    /* ===============================
       أنواع الفعاليات
       =============================== */

    renderActivityTypeBreakdown(
      records,
      currentProfile
    );


    /* ===============================
       نشاط المعلمات
       =============================== */

    renderTeacherActivity(
      records,
      currentProfile,
      allProfiles
    );


    updatePerformanceReportLink();


    /* ===============================
       آخر العمليات
       =============================== */

    const sortedRecords =
      [...records].sort(
        (a, b) =>
          getRecordDate(b).getTime() -
          getRecordDate(a).getTime()
      );


    renderRecentRecords(
      sortedRecords,
      recentBox
    );


  } catch (error) {

    console.error(
      "Dashboard error:",
      error
    );


    setDashboardText(
      "statAll",
      0
    );

    setDashboardText(
      "statActivities",
      0
    );

    setDashboardText(
      "statMeetings",
      0
    );

    setDashboardText(
      "statCertificates",
      0
    );


    recentBox.innerHTML = `
      <div class="empty">
        تعذر تحميل السجلات.
        <br>
        تأكدي من تسجيل الدخول ثم أعيدي تحميل الصفحة.
      </div>
    `;

  }

}


/* =========================================================
   كتابة قيمة
   ========================================================= */

function setDashboardText(
  id,
  value
) {

  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      String(value ?? "");
  }

}


/* =========================================================
   قراءة عدد المستفيدين من السجل
   ========================================================= */

function getBeneficiaryCount(
  record
) {

  const rawValue =
    record?.payload?.count ??
    record?.payload?.beneficiaries ??
    record?.payload?.beneficiaryCount ??
    record?.count ??
    0;


  const value =
    Number(rawValue);


  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return 0;
  }


  return value;

}


/* =========================================================
   إجمالي المستفيدين
   ========================================================= */

function calculateBeneficiaries(
  records
) {

  return (records || [])
    .reduce(
      (sum, record) =>
        sum +
        getBeneficiaryCount(record),
      0
    );

}


/* =========================================================
   المؤشرات الإدارية
   ========================================================= */

function renderAdminInsights(
  records,
  currentProfile
) {

  const section =
    document.getElementById(
      "adminInsightsSection"
    );


  if (!section) return;


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


  const activities =
    records.filter(
      record =>
        record.type === "activity"
    );


  /* إجمالي المستفيدين */

  setDashboardText(
    "statBeneficiaries",
    calculateBeneficiaries(
      activities
    )
  );


  const now =
    new Date();


  const currentMonthStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );


  const nextMonthStart =
    new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    );


  const previousMonthStart =
    new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );


  const currentMonthActivities =
    activities.filter(
      record => {

        const date =
          getActivityDate(record);

        return (
          date.getTime() !== 0 &&
          date >= currentMonthStart &&
          date < nextMonthStart
        );

      }
    );


  const previousMonthActivities =
    activities.filter(
      record => {

        const date =
          getActivityDate(record);

        return (
          date.getTime() !== 0 &&
          date >= previousMonthStart &&
          date < currentMonthStart
        );

      }
    );


  const currentCount =
    currentMonthActivities.length;

  const previousCount =
    previousMonthActivities.length;


  setDashboardText(
    "statCurrentMonth",
    currentCount
  );

  setDashboardText(
    "statPreviousMonth",
    previousCount
  );


  const currentMonthName =
    currentMonthStart
      .toLocaleDateString(
        "ar-BH",
        {
          month: "long",
          year: "numeric"
        }
      );


  const previousMonthName =
    previousMonthStart
      .toLocaleDateString(
        "ar-BH",
        {
          month: "long",
          year: "numeric"
        }
      );


  setDashboardText(
    "currentMonthLabel",
    currentMonthName
  );

  setDashboardText(
    "previousMonthLabel",
    previousMonthName
  );


  const change =
    currentCount -
    previousCount;


  let percentage = 0;


  if (previousCount > 0) {

    percentage =
      Math.round(
        (change / previousCount) *
        100
      );

  } else if (
    currentCount > 0
  ) {

    percentage = 100;

  }


  const monthChange =
    document.getElementById(
      "statMonthChange"
    );


  const comparisonText =
    document.getElementById(
      "monthComparisonText"
    );


  const trend =
    document.getElementById(
      "monthTrend"
    );


  if (
    currentCount >
    previousCount
  ) {

    if (monthChange) {
      monthChange.textContent =
        `+${Math.abs(percentage)}%`;
    }


    if (trend) {

      trend.textContent =
        `↑ زيادة ${Math.abs(percentage)}%`;

      trend.className =
        "month-trend up";

    }

  } else if (
    currentCount <
    previousCount
  ) {

    if (monthChange) {
      monthChange.textContent =
        `-${Math.abs(percentage)}%`;
    }


    if (trend) {

      trend.textContent =
        `↓ انخفاض ${Math.abs(percentage)}%`;

      trend.className =
        "month-trend down";

    }

  } else {

    if (monthChange) {
      monthChange.textContent =
        "0%";
    }


    if (trend) {

      trend.textContent =
        "— ثابت";

      trend.className =
        "month-trend same";

    }

  }


  if (comparisonText) {

    comparisonText.textContent =
      `تم تسجيل ${currentCount} فعالية في ${currentMonthName} مقابل ${previousCount} في ${previousMonthName}.`;

  }

}


/* =========================================================
   توزيع أنواع الفعاليات
   ========================================================= */

function renderActivityTypeBreakdown(
  records,
  currentProfile
) {

  const oldSection =
    document.getElementById(
      "activityTypeBreakdownSection"
    );


  if (oldSection) {
    oldSection.remove();
  }


  if (
    !currentProfile ||
    currentProfile.role !== "admin"
  ) {
    return;
  }


  const statsBox =
    document.querySelector(
      ".stats"
    );


  if (!statsBox) return;


  const activities =
    records.filter(
      record =>
        record.type === "activity"
    );


  const knownTypes = [
    "فعالية",
    "برنامج",
    "مبادرة",
    "ورشة عمل",
    "احتفال",
    "مسابقة",
    "زيارة",
    "اجتماع",
    "تفعيل حصة احتياط",
    "أخرى"
  ];


  const counts = {};


  knownTypes.forEach(
    type => {
      counts[type] = 0;
    }
  );


  activities.forEach(
    record => {

      const type =
        getActivityTypeLabel(record);


      if (
        Object.prototype
          .hasOwnProperty
          .call(
            counts,
            type
          )
      ) {

        counts[type]++;

      } else {

        counts["أخرى"]++;

      }

    }
  );


  const total =
    activities.length;


  const sortedTypes =
    knownTypes
      .map(
        type => ({
          type,
          count:
            counts[type]
        })
      )
      .sort(
        (a, b) =>
          b.count - a.count
      );


  const section =
    document.createElement(
      "section"
    );


  section.id =
    "activityTypeBreakdownSection";


  section.style.cssText = `
    margin-top:28px;
    margin-bottom:28px;
  `;


  const cards =
    sortedTypes
      .map(
        item => {

          const percentage =
            total
              ? Math.round(
                  item.count /
                  total *
                  100
                )
              : 0;


          return `
            <div
              style="
                background:#fff;
                border:1px solid #e1e9e5;
                border-radius:14px;
                padding:15px;
                box-shadow:0 3px 12px rgba(0,0,0,.04);
                min-height:106px;
              "
            >

              <div
                style="
                  color:#4f635a;
                  font-size:13px;
                  font-weight:700;
                "
              >
                ${escapeDashboardHtml(item.type)}
              </div>

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:flex-end;
                  margin-top:10px;
                "
              >

                <strong
                  style="
                    color:#075c40;
                    font-size:28px;
                  "
                >
                  ${item.count}
                </strong>

                <span
                  style="
                    color:#7b8982;
                    font-size:12px;
                  "
                >
                  ${percentage}%
                </span>

              </div>

              <div
                style="
                  height:5px;
                  background:#edf2ef;
                  border-radius:20px;
                  overflow:hidden;
                  margin-top:10px;
                "
              >

                <div
                  style="
                    height:100%;
                    width:${percentage}%;
                    background:#087451;
                  "
                ></div>

              </div>

            </div>
          `;

        }
      )
      .join("");


  const highest =
    sortedTypes[0];


  const highestText =
    total && highest
      ? `أعلى نوع توثيقًا: ${highest.type} (${highest.count})`
      : "لا توجد فعاليات محفوظة بعد";


  section.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
        flex-wrap:wrap;
        margin-bottom:14px;
      "
    >

      <div>

        <h3
          class="section-title"
          style="margin:0;"
        >
          📊 توزيع الفعاليات حسب النوع
        </h3>

        <p
          style="
            margin:6px 0 0;
            color:#6b7a72;
            font-size:13px;
          "
        >
          قراءة مباشرة لأنواع التوثيق المسجلة في المنصة.
        </p>

      </div>

      <div
        style="
          background:#f5f8f6;
          border:1px solid #e1e9e5;
          border-radius:12px;
          padding:10px 14px;
          color:#075c40;
          font-size:13px;
          font-weight:700;
        "
      >
        إجمالي الفعاليات: ${total}
      </div>

    </div>


    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(155px,1fr)
          );
        gap:10px;
      "
    >
      ${cards}
    </div>


    <div
      style="
        margin-top:12px;
        padding:10px 12px;
        background:#f8faf9;
        border-radius:10px;
        color:#5f7068;
        font-size:12px;
      "
    >
      ${escapeDashboardHtml(
        highestText
      )}
    </div>

  `;


  statsBox.insertAdjacentElement(
    "afterend",
    section
  );

}


/* =========================================================
   الفترة المحددة
   ========================================================= */

function getTeacherFilterRange() {

  return {

    from:
      document
        .getElementById(
          "teacherFromDate"
        )
        ?.value ||
      "",

    to:
      document
        .getElementById(
          "teacherToDate"
        )
        ?.value ||
      ""

  };

}


/* =========================================================
   تاريخ الفعالية
   ========================================================= */

function getActivityDate(
  record
) {

  const rawDate =
    record?.record_date ||
    record?.payload?.date ||
    record?.date ||
    "";


  if (!rawDate) {
    return new Date(0);
  }


  const date =
    new Date(
      String(rawDate)
        .slice(0,10) +
      "T00:00:00"
    );


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
   هل التاريخ داخل الفترة؟
   ========================================================= */

function isActivityInRange(
  record,
  from,
  to
) {

  const date =
    getActivityDate(record);


  if (
    date.getTime() === 0
  ) {
    return false;
  }


  if (from) {

    const fromDate =
      new Date(
        from +
        "T00:00:00"
      );


    if (
      date <
      fromDate
    ) {
      return false;
    }

  }


  if (to) {

    const toDate =
      new Date(
        to +
        "T23:59:59"
      );


    if (
      date >
      toDate
    ) {
      return false;
    }

  }


  return true;

}


/* =========================================================
   نشاط المعلمات
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


  const oldDetails =
    document.getElementById(
      "teacherActivityDetails"
    );


  if (oldDetails) {
    oldDetails.remove();
  }


  const {
    from,
    to
  } =
    getTeacherFilterRange();


  const periodActivities =
    records.filter(
      record =>
        record.type === "activity" &&
        isActivityInRange(
          record,
          from,
          to
        )
    );


  const periodSummary =
    document.getElementById(
      "teacherPeriodSummary"
    );


  if (periodSummary) {

    if (
      from ||
      to
    ) {

      let text =
        `عدد الفعاليات في الفترة: ${periodActivities.length}`;


      if (
        from &&
        to
      ) {

        text +=
          ` — من ${formatSimpleDate(from)} إلى ${formatSimpleDate(to)}`;

      } else if (from) {

        text +=
          ` — من ${formatSimpleDate(from)}`;

      } else {

        text +=
          ` — حتى ${formatSimpleDate(to)}`;

      }


      periodSummary.textContent =
        text;


    } else {

      periodSummary.textContent =
        `جميع الفترات — إجمالي الفعاليات: ${periodActivities.length}`;

    }

  }


  const teachers =
    (profiles || [])
      .filter(
        profile =>
          profile.role === "teacher"
      )
      .sort(
        (a, b) =>
          String(
            a.full_name ||
            ""
          ).localeCompare(
            String(
              b.full_name ||
              ""
            ),
            "ar"
          )
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
    const teacherStats =
    teachers.map(
      teacher => {

        const teacherRecords =
          periodActivities
            .filter(
              record =>
                String(
                  record.created_by
                ) ===
                String(
                  teacher.id
                )
            )
            .sort(
              (a, b) =>
                getActivityDate(
                  b
                ).getTime() -
                getActivityDate(
                  a
                ).getTime()
            );


        return {

          teacher,

          records:
            teacherRecords,

          activityCount:
            teacherRecords.length,

          beneficiaries:
            calculateBeneficiaries(
              teacherRecords
            )

        };

      }
    );


  /* =====================================================
     القائمة المنسدلة للمعلمات
     ===================================================== */

  listBox.innerHTML =
    `

    <div
      style="
        background:#fff;
        border:1px solid #e0e9e4;
        border-radius:16px;
        padding:18px;
        box-shadow:0 3px 12px rgba(0,0,0,.04);
      "
    >

      <label
        for="teacherActivitySelect"
        style="
          display:block;
          margin-bottom:8px;
          color:#52685f;
          font-size:13px;
          font-weight:700;
        "
      >
        اسم المعلمة
      </label>


      <select
        id="teacherActivitySelect"
        style="
          width:100%;
          box-sizing:border-box;
          padding:13px 14px;
          border:1px solid #d7e1dc;
          border-radius:11px;
          background:#fff;
          color:#27493d;
          font-family:inherit;
          font-size:15px;
          outline:none;
          cursor:pointer;
        "
      >

        <option value="">
          — اختاري اسم المعلمة —
        </option>


        ${teacherStats
          .map(
            item =>
              `
              <option
                value="${escapeDashboardHtml(
                  item.teacher.id
                )}"
              >
                ${escapeDashboardHtml(
                  item.teacher.full_name ||
                  "معلمة"
                )}
              </option>
              `
          )
          .join("")
        }

      </select>

    </div>


    <div
      id="selectedTeacherActivity"
      style="
        margin-top:14px;
      "
    >
    </div>

    `;


  const select =
    document.getElementById(
      "teacherActivitySelect"
    );


  const selectedBox =
    document.getElementById(
      "selectedTeacherActivity"
    );


  /* =====================================================
     عرض بيانات المعلمة المختارة
     ===================================================== */

  function renderSelectedTeacher(
    teacherId
  ) {

    if (!selectedBox) {
      return;
    }


    if (!teacherId) {

      selectedBox.innerHTML =
        `
        <div
          style="
            background:#f8faf9;
            border:1px dashed #d9e4df;
            border-radius:14px;
            padding:24px;
            text-align:center;
            color:#6b7a72;
          "
        >
          اختاري اسم المعلمة لعرض نشاطها.
        </div>
        `;

      return;
    }


    const item =
      teacherStats.find(
        row =>
          String(
            row.teacher.id
          ) ===
          String(
            teacherId
          )
      );


    if (!item) {

      selectedBox.innerHTML =
        `
        <div class="empty">
          تعذر العثور على بيانات المعلمة.
        </div>
        `;

      return;
    }


    const {
      teacher,
      records: teacherRecords,
      activityCount,
      beneficiaries
    } =
      item;


    let latestTitle =
      "—";


    let latestText =
      "لا توجد فعاليات";


    if (
      teacherRecords.length
    ) {

      latestTitle =
        getRecordTitle(
          teacherRecords[0]
        );


      latestText =
        formatActivityDate(
          teacherRecords[0]
        );

    }


    selectedBox.innerHTML =
      `

      <div
        style="
          width:100%;
          box-sizing:border-box;
          border:1px solid #e2ebe6;
          background:#fff;
          border-radius:16px;
          padding:18px;
          box-shadow:0 3px 12px rgba(0,0,0,.04);
        "
      >


        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:14px;
            flex-wrap:wrap;
          "
        >


          <div
            style="
              flex:1;
              min-width:220px;
            "
          >

            <strong
              style="
                display:block;
                color:#075c40;
                font-size:20px;
                margin-bottom:10px;
              "
            >
              ${escapeDashboardHtml(
                teacher.full_name ||
                "معلمة"
              )}
            </strong>


            <div
              style="
                color:#5f7068;
                font-size:13px;
                margin-bottom:6px;
              "
            >

              آخر فعالية:

              <strong>
                ${escapeDashboardHtml(
                  latestTitle
                )}
              </strong>

            </div>


            <div
              style="
                color:#7b8982;
                font-size:12px;
              "
            >
              ${escapeDashboardHtml(
                latestText
              )}
            </div>

          </div>



          <div
            style="
              display:grid;
              grid-template-columns:
                repeat(
                  2,
                  minmax(
                    100px,
                    1fr
                  )
                );
              gap:10px;
              min-width:230px;
            "
          >


            <div
              style="
                background:#f5f8f6;
                border-radius:12px;
                padding:13px;
                text-align:center;
              "
            >

              <strong
                style="
                  display:block;
                  color:#075c40;
                  font-size:27px;
                "
              >
                ${activityCount}
              </strong>

              <span
                style="
                  color:#6b7a72;
                  font-size:12px;
                "
              >
                فعالية
              </span>

            </div>



            <div
              style="
                background:#f5f8f6;
                border-radius:12px;
                padding:13px;
                text-align:center;
              "
            >

              <strong
                style="
                  display:block;
                  color:#075c40;
                  font-size:27px;
                "
              >
                ${beneficiaries}
              </strong>

              <span
                style="
                  color:#6b7a72;
                  font-size:12px;
                "
              >
                مستفيد
              </span>

            </div>


          </div>


        </div>



        <div
          style="
            margin-top:14px;
            display:flex;
            justify-content:flex-end;
          "
        >

          <button
            type="button"
            class="btn btn-soft"
            id="selectedTeacherReportsBtn"
          >
            عرض تقارير المعلمة
          </button>

        </div>


      </div>

      `;


    document
      .getElementById(
        "selectedTeacherReportsBtn"
      )
      ?.addEventListener(
        "click",
        () => {

          showTeacherReports(
            teacher,
            teacherRecords,
            from,
            to
          );

        }
      );

  }


  /* =====================================================
     عند اختيار معلمة
     ===================================================== */

  select?.addEventListener(
    "change",
    event => {

      const oldDetails =
        document.getElementById(
          "teacherActivityDetails"
        );


      if (oldDetails) {
        oldDetails.remove();
      }


      renderSelectedTeacher(
        event.target.value
      );

    }
  );


  renderSelectedTeacher(
    ""
  );

}


/* =========================================================
   عرض تقارير المعلمة
   ========================================================= */

function showTeacherReports(
  teacher,
  records,
  from,
  to
) {

  const section =
    document.getElementById(
      "teacherActivitySection"
    );


  if (!section) {
    return;
  }


  const oldDetails =
    document.getElementById(
      "teacherActivityDetails"
    );


  if (oldDetails) {
    oldDetails.remove();
  }


  const details =
    document.createElement(
      "div"
    );


  details.id =
    "teacherActivityDetails";


  details.style.cssText = `
    margin-top:18px;
    background:#fff;
    border:1px solid #e1e9e5;
    border-radius:16px;
    padding:18px;
    box-shadow:0 3px 12px rgba(0,0,0,.04);
  `;


  let periodText =
    "جميع الفترات";


  if (
    from &&
    to
  ) {

    periodText =
      `من ${formatSimpleDate(from)} إلى ${formatSimpleDate(to)}`;

  } else if (from) {

    periodText =
      `من ${formatSimpleDate(from)}`;

  } else if (to) {

    periodText =
      `حتى ${formatSimpleDate(to)}`;

  }


  const recordsHtml =
    records.length
      ? records
          .map(
            record => {

              const title =
                getRecordTitle(
                  record
                );


              const date =
                formatActivityDate(
                  record
                );


              const beneficiaries =
                getBeneficiaryCount(
                  record
                );


              return `

                <div
                  style="
                    padding:13px 0;
                    border-bottom:1px solid #edf1ef;
                  "
                >

                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      align-items:flex-start;
                      gap:12px;
                      flex-wrap:wrap;
                    "
                  >

                    <div>

                      <strong
                        style="
                          display:block;
                          color:#075c40;
                          margin-bottom:5px;
                        "
                      >
                        ${escapeDashboardHtml(
                          title
                        )}
                      </strong>

                      <span
                        style="
                          color:#78857e;
                          font-size:12px;
                        "
                      >
                        ${escapeDashboardHtml(
                          date
                        )}
                      </span>

                    </div>


                    <div
                      style="
                        background:#f5f8f6;
                        border-radius:10px;
                        padding:7px 10px;
                        color:#52685f;
                        font-size:12px;
                      "
                    >
                      المستفيدون:
                      <strong>
                        ${beneficiaries}
                      </strong>
                    </div>

                  </div>

                </div>

              `;

            }
          )
          .join("")
      : `
          <div class="empty">
            لا توجد فعاليات لهذه المعلمة في الفترة المحددة.
          </div>
        `;


  details.innerHTML = `

    <div
      style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
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
          ${escapeDashboardHtml(
            teacher.full_name ||
            "المعلمة"
          )}
        </h3>

        <div
          style="
            margin-top:5px;
            color:#75837c;
            font-size:12px;
          "
        >
          ${escapeDashboardHtml(
            periodText
          )}
        </div>

      </div>


      <button
        type="button"
        class="btn btn-soft"
        id="closeTeacherActivityDetails"
      >
        إغلاق
      </button>

    </div>


    <div
      style="
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(140px,1fr)
          );
        gap:10px;
        margin-bottom:15px;
      "
    >

      <div
        style="
          background:#f5f8f6;
          border-radius:12px;
          padding:13px;
          text-align:center;
        "
      >

        <strong
          style="
            display:block;
            color:#075c40;
            font-size:25px;
          "
        >
          ${records.length}
        </strong>

        <span
          style="
            color:#6b7a72;
            font-size:12px;
          "
        >
          إجمالي الفعاليات
        </span>

      </div>


      <div
        style="
          background:#f5f8f6;
          border-radius:12px;
          padding:13px;
          text-align:center;
        "
      >

        <strong
          style="
            display:block;
            color:#075c40;
            font-size:25px;
          "
        >
          ${calculateBeneficiaries(records)}
        </strong>

        <span
          style="
            color:#6b7a72;
            font-size:12px;
          "
        >
          إجمالي المستفيدين
        </span>

      </div>

    </div>


    <div>
      ${recordsHtml}
    </div>

  `;


  section.appendChild(
    details
  );


  document
    .getElementById(
      "closeTeacherActivityDetails"
    )
    ?.addEventListener(
      "click",
      () => {
        details.remove();
      }
    );


  details.scrollIntoView({
    behavior:
      "smooth",
    block:
      "start"
  });

}


/* =========================================================
   تحديث رابط تقرير الأداء
   ========================================================= */

function updatePerformanceReportLink() {

  const link =
    document.getElementById(
      "teacherPerformanceReportLink"
    );


  if (!link) {
    return;
  }


  const {
    from,
    to
  } =
    getTeacherFilterRange();


  const params =
    new URLSearchParams();


  if (from) {
    params.set(
      "from",
      from
    );
  }


  if (to) {
    params.set(
      "to",
      to
    );
  }


  const query =
    params.toString();


  link.href =
    query
      ? `pages/reports/teacher-performance.html?${query}`
      : "pages/reports/teacher-performance.html";

}


/* =========================================================
   آخر العمليات
   ========================================================= */

function renderRecentRecords(
  records,
  recentBox
) {

  if (
    !records.length
  ) {

    recentBox.innerHTML = `
      <div class="empty">
        لا توجد عمليات محفوظة حتى الآن.
      </div>
    `;

    return;
  }


  recentBox.innerHTML =
    records
      .slice(
        0,
        8
      )
      .map(
        record => {

          const title =
            getRecordTitle(
              record
            );


          const type =
            getRecordTypeLabel(
              record
            );


          const date =
            formatRecordDate(
              record
            );


          return `

            <div
              class="recent-item"
            >

              <div>

                <strong>
                  ${escapeDashboardHtml(
                    title
                  )}
                </strong>

                <span>
                  ${escapeDashboardHtml(
                    type
                  )}
                </span>

              </div>


              <small>
                ${escapeDashboardHtml(
                  date
                )}
              </small>

            </div>

          `;

        }
      )
      .join("");

}


/* =========================================================
   اسم السجل
   ========================================================= */

function getRecordTitle(
  record
) {

  return (
    record?.title ||
    record?.payload?.title ||
    record?.payload?.name ||
    "بدون عنوان"
  );

}


/* =========================================================
   نوع السجل
   ========================================================= */

function getRecordTypeLabel(
  record
) {

  const labels = {

    activity:
      "فعالية",

    meeting:
      "اجتماع",

    invitation:
      "دعوة",

    attendance:
      "حضور",

    recommendation:
      "توصيات",

    certificate:
      "شهادة"

  };


  return (
    labels[
      record?.type
    ] ||
    record?.type ||
    "سجل"
  );

}


/* =========================================================
   نوع الفعالية
   ========================================================= */

function getActivityTypeLabel(
  record
) {

  const payload =
    record?.payload ||
    {};


  const value =
    String(
      payload.activityType ||
      payload.activity_type ||
      payload.typeName ||
      payload.category ||
      payload.kind ||
      ""
    ).trim();


  return (
    value ||
    "فعالية"
  );

}


/* =========================================================
   تاريخ السجل
   ========================================================= */

function getRecordDate(
  record
) {

  const raw =
    record?.updated_at ||
    record?.created_at ||
    record?.record_date ||
    record?.payload?.date ||
    "";


  if (!raw) {
    return new Date(0);
  }


  const date =
    new Date(raw);


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
   تنسيق تاريخ السجل
   ========================================================= */

function formatRecordDate(
  record
) {

  const date =
    getRecordDate(
      record
    );


  if (
    date.getTime() === 0
  ) {
    return "—";
  }


  return date
    .toLocaleString(
      "ar-BH",
      {
        year:
          "numeric",
        month:
          "short",
        day:
          "numeric"
      }
    );

}


/* =========================================================
   تنسيق تاريخ الفعالية
   ========================================================= */

function formatActivityDate(
  record
) {

  const date =
    getActivityDate(
      record
    );


  if (
    date.getTime() === 0
  ) {
    return "—";
  }


  return date
    .toLocaleDateString(
      "ar-BH",
      {
        year:
          "numeric",
        month:
          "long",
        day:
          "numeric"
      }
    );

}


/* =========================================================
   تنسيق تاريخ بسيط
   ========================================================= */

function formatSimpleDate(
  value
) {

  if (!value) {
    return "";
  }


  const date =
    new Date(
      value +
      "T00:00:00"
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date
    .toLocaleDateString(
      "ar-BH",
      {
        year:
          "numeric",
        month:
          "short",
        day:
          "numeric"
      }
    );

}


/* =========================================================
   حماية HTML
   ========================================================= */

function escapeDashboardHtml(
  value
) {

  return String(
    value ??
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   فلاتر نشاط المعلمات
   ========================================================= */

document
  .getElementById(
    "applyTeacherFilterBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      renderTeacherActivity(
        dashboardRecords,
        dashboardCurrentProfile,
        dashboardProfiles
      );


      updatePerformanceReportLink();

    }
  );


document
  .getElementById(
    "clearTeacherFilterBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      const from =
        document.getElementById(
          "teacherFromDate"
        );


      const to =
        document.getElementById(
          "teacherToDate"
        );


      if (from) {
        from.value = "";
      }


      if (to) {
        to.value = "";
      }


      renderTeacherActivity(
        dashboardRecords,
        dashboardCurrentProfile,
        dashboardProfiles
      );


      updatePerformanceReportLink();

    }
  );


/* =========================================================
   تشغيل الصفحة
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    renderDashboard();

  }
);