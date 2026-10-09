const FIELD_IDS = [
  "name",
  "activityType",
  "executor",
  "department",
  "date",
  "startTime",
  "endTime",
  "place",
  "activityApproved",
  "projectLinks",
  "target",
  "count",
  "goal",
  "implementation",
  "results",
  "recommendations",
  "notes"
];

const DRAFT_KEY = "wr_activity_draft_v3";

let currentId = null;
let selectedFiles = [];
let existingImageRefs = [];
let remoteImagePaths = [];
let currentUser = null;
let currentProfile = null;

/* الجديد: العام الدراسي النشط */
let currentSchoolYear = "";

let loadedRecordOwnerId = null;
let loadedRecordOwnerEmail = "";


/* =========================================================
   Supabase client
   ========================================================= */

function getActivitySupabase() {
  return window.supabase.createClient(
    window.WR_CONFIG.supabaseUrl,
    window.WR_CONFIG.supabaseKey
  );
}


/* =========================================================
   بيانات المستخدم الحالي
   ========================================================= */

async function loadCurrentProfile() {

  try {

    if (
      !window.WRGraph ||
      typeof WRGraph.getAccount !== "function"
    ) {
      console.warn("WRGraph غير متاح");
      return null;
    }

    currentUser = await WRGraph.getAccount();

    if (!currentUser) {
      console.warn("لا يوجد مستخدم مسجل الدخول");
      return null;
    }

    const sb = getActivitySupabase();

    const { data, error } = await sb
      .from("user_profiles")
      .select("user_id, full_name, role, department_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile error:", error);
      return null;
    }

    currentProfile = data;

    if (currentProfile?.full_name) {

      $("executor").value =
        currentProfile.full_name;

      if (
        currentProfile.role === "teacher" ||
        currentProfile.role === "coordinator"
      ) {

        $("executor").readOnly = true;

        $("executor").title =
          "يتم تحديد اسم المنفذ تلقائيًا من الحساب المسجل";
      }
    }

    if (
      currentProfile?.department_id &&
      !$("department").value.trim()
    ) {

      try {

        const {
          data: departmentRow,
          error: departmentError
        } = await sb
          .from("departments")
          .select("name")
          .eq("id", currentProfile.department_id)
          .maybeSingle();

        if (departmentError) {
          console.warn(
            "Department error:",
            departmentError
          );
        }

        if (departmentRow?.name) {
          $("department").value =
            departmentRow.name;
        }

      } catch (departmentError) {

        console.warn(
          "تعذر تحميل اسم القسم:",
          departmentError
        );
      }
    }

    updatePreview();

    return currentProfile;

  } catch (error) {

    console.error(
      "تعذر تحميل بيانات المستخدم:",
      error
    );

    return null;
  }
}


/* =========================================================
   مؤشرات الفعالية متعددة الاختيار
   ========================================================= */

function getCheckedValues(selector) {

  return [
    ...document.querySelectorAll(
      selector + ":checked"
    )
  ].map(
    input => input.value
  );
}


function setCheckedValues(
  selector,
  values
) {

  const wanted =
    new Set(
      Array.isArray(values)
        ? values
        : String(values || "")
            .split("،")
            .map(
              value =>
                value.trim()
            )
            .filter(Boolean)
    );


  document
    .querySelectorAll(selector)
    .forEach(
      input => {

        input.checked =
          wanted.has(
            input.value
          );

      }
    );
}


function syncActivityIndicators() {

  const projects =
    getCheckedValues(
      ".wr-project-check"
    );

  const targets =
    getCheckedValues(
      ".wr-target-check"
    );


  if ($("projectLinks")) {

    $("projectLinks").value =
      projects.join("، ");

  }


  if ($("target")) {

    $("target").value =
      targets.join("، ");

  }


  return {
    projects,
    targets
  };
}


/* =========================================================
   قراءة قيم النموذج
   ========================================================= */

function values() {

  const data = {};

  FIELD_IDS.forEach(id => {

    if ($(id)) {
      data[id] =
        $(id).value;
    }

  });

  return data;
}


/* =========================================================
   تعبئة النموذج
   ========================================================= */

function applyValues(data = {}) {

  FIELD_IDS.forEach(id => {

    if (
      data[id] !== undefined &&
      data[id] !== null &&
      $(id)
    ) {

      $(id).value =
        data[id];

    }

  });


  const projectValues =
    Array.isArray(
      data.projects
    )
      ? data.projects
      : (
          data.projectLinks ||
          ""
        );


  const targetValues =
    Array.isArray(
      data.targetGroups
    )
      ? data.targetGroups
      : (
          data.target ||
          ""
        );


  setCheckedValues(
    ".wr-project-check",
    projectValues
  );


  setCheckedValues(
    ".wr-target-check",
    targetValues
  );


  syncActivityIndicators();

  updatePreview();
}


/* =========================================================
   بيانات التقرير
   ========================================================= */

function recordData() {

  return {

    type:
      "activity",

    /* الجديد: يُحفظ تلقائيًا مع التقرير */
    school_year:
      currentSchoolYear || "",

    title:
      $("name").value.trim() ||
      "تقرير فعالية",

    activityType:
      $("activityType").value,

    executor:
      $("executor").value.trim(),

    department:
      $("department").value.trim(),

    date:
      $("date").value,

    startTime:
      $("startTime").value,

    endTime:
      $("endTime").value,

    place:
      $("place").value.trim(),

    activityApproved:
      $("activityApproved")?.value ||
      "",

    projects:
      getCheckedValues(
        ".wr-project-check"
      ),

    projectLinks:
      $("projectLinks")
        ?.value
        .trim() ||
      "",

    targetGroups:
      getCheckedValues(
        ".wr-target-check"
      ),

    target:
      $("target").value.trim(),

    count:
      $("count").value,

    goal:
      $("goal").value,

    implementation:
      $("implementation").value,

    results:
      $("results").value,

    recommendations:
      $("recommendations").value,

    notes:
      $("notes").value,

    owner_id:
      loadedRecordOwnerId ||
      currentUser?.id ||
      "",

    owner_name:
      $("executor").value.trim(),

    owner_role:
      currentProfile?.role ||
      "",

    owner_email:
      loadedRecordOwnerEmail ||
      (
        (
          !loadedRecordOwnerId ||
          String(
            loadedRecordOwnerId
          ) ===
          String(
            currentUser?.id ||
            ""
          )
        )
          ? (
              currentUser?.email ||
              ""
            )
          : ""
      ),

    image_paths:
      remoteImagePaths
  };
}


/* =========================================================
   تحديث المعاينة
   ========================================================= */

function updatePreview() {

  const data =
    recordData();


  $("pName").textContent =
    data.title;


  $("pType").textContent =
    data.activityType ||
    "—";


  $("pExecutor").textContent =
    data.executor ||
    "—";


  $("pDepartment").textContent =
    data.department ||
    "—";


  $("pDate").textContent =
    wrFormatDate(
      data.date
    );


  $("pTime").textContent =
    [
      wrFormatTime(
        data.startTime
      ),
      wrFormatTime(
        data.endTime
      )
    ]
      .filter(
        x =>
          x !== "—"
      )
      .join(" – ") ||
    "—";


  $("pPlace").textContent =
    data.place ||
    "—";


  if (
    $("pApproval")
  ) {

    $("pApproval").textContent =
      data.activityApproved ===
      "yes"
        ? "نعم"
        : data.activityApproved ===
          "no"
          ? "لا"
          : "—";

  }


  if (
    $("pProjects")
  ) {

    $("pProjects").textContent =
      data.projectLinks ||
      (
        Array.isArray(
          data.projects
        )
          ? data.projects.join(
              "، "
            )
          : ""
      ) ||
      "—";

  }


  $("pTarget").textContent =
    data.target ||
    "—";


  $("pCount").textContent =
    data.count ||
    "—";


  $("pGoal").textContent =
    data.goal ||
    "—";


  $("pImplementation").textContent =
    data.implementation ||
    "—";


  $("pResults").textContent =
    data.results ||
    "—";


  $("pRecommendations").textContent =
    data.recommendations ||
    "—";


  $("pNotes").textContent =
    data.notes ||
    "—";
}


/* =========================================================
   حفظ المسودة
   ========================================================= */

function saveDraft() {

  if (currentId) {
    return;
  }


  syncActivityIndicators();


  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      ...values(),

      projects:
        getCheckedValues(
          ".wr-project-check"
        ),

      targetGroups:
        getCheckedValues(
          ".wr-target-check"
        ),

      savedAt:
        new Date()
          .toISOString()
    })
  );


  $("draftState").textContent =
    "تم حفظ المسودة تلقائيًا: " +
    new Date()
      .toLocaleTimeString(
        "ar-BH"
      );
}


let draftTimer;


/* =========================================================
   مراقبة الحقول
   ========================================================= */

FIELD_IDS.forEach(id => {

  const field =
    $(id);


  if (!field) {
    return;
  }


  field.addEventListener(
    "input",
    () => {

      syncActivityIndicators();

      updatePreview();

      clearTimeout(
        draftTimer
      );


      draftTimer =
        setTimeout(
          saveDraft,
          450
        );

    }
  );


  field.addEventListener(
    "change",
    () => {

      syncActivityIndicators();

      updatePreview();

      clearTimeout(
        draftTimer
      );


      draftTimer =
        setTimeout(
          saveDraft,
          450
        );

    }
  );

});


document
  .querySelectorAll(
    ".wr-project-check, .wr-target-check"
  )
  .forEach(
    input => {

      input.addEventListener(
        "change",
        () => {

          syncActivityIndicators();

          updatePreview();

          clearTimeout(
            draftTimer
          );


          draftTimer =
            setTimeout(
              saveDraft,
              450
            );

        }
      );

    }
  );


/* =========================================================
   عرض الصور
   ========================================================= */

async function renderImages() {

  const box =
    $("pImages");


  box.innerHTML =
    "";


  const sources =
    [];


  for (
    const ref of
    existingImageRefs
  ) {

    try {

      const file =
        await wrGetFile(
          ref
        );


      if (file) {

        sources.push({

          name:
            file.name,

          url:
            URL.createObjectURL(
              file.blob
            ),

          revoke:
            true

        });

      }

    } catch (error) {

      console.warn(
        "تعذر قراءة صورة محلية:",
        error
      );

    }

  }


  for (
    const path of
    remoteImagePaths
  ) {

    try {

      const url =
        await WRGraph
          .getFileUrl(
            path
          );


      if (url) {

        sources.push({

          name:
            path
              .split("/")
              .pop(),

          url,

          revoke:
            false

        });

      }

    } catch (error) {

      console.warn(
        "تعذر تحميل صورة من Supabase:",
        error
      );

    }

  }


  for (
    const file of
    selectedFiles
  ) {

    sources.push({

      name:
        file.name,

      url:
        URL.createObjectURL(
          file
        ),

      revoke:
        true

    });

  }


  sources
    .slice(
      0,
      10
    )
    .forEach(
      source => {

        const figure =
          document
            .createElement(
              "figure"
            );


        figure.className =
          "report-photo";


        const image =
          new Image();


        image.src =
          source.url;


        image.alt =
          source.name ||
          "صورة الفعالية";


        image.onload =
          () => {

            if (
              source.revoke
            ) {

              setTimeout(
                () => {

                  URL
                    .revokeObjectURL(
                      source.url
                    );

                },
                5000
              );

            }

          };


        figure
          .appendChild(
            image
          );


        box
          .appendChild(
            figure
          );

      }
    );


  $("noImages")
    .classList
    .toggle(
      "hidden",
      sources.length > 0
    );
}


/* =========================================================
   اختيار الصور
   ========================================================= */

$("images")
  .addEventListener(
    "change",
    () => {

      selectedFiles =
        [
          ...$("images").files
        ]
          .slice(
            0,
            10
          );


      $("imageHint")
        .textContent =
        `تم اختيار ${selectedFiles.length} صورة`;


      renderImages();

    }
  );


/* =========================================================
   تحميل تقرير محفوظ
   ========================================================= */

async function loadRecord(
  id
) {

  try {

    const records =
      await WRGraph
        .fetchRecords();


    const row =
      records.find(
        record =>
          String(
            record.id
          ) ===
          String(
            id
          )
      );


    if (!row) {

      wrToast(
        "السجل غير موجود أو لا تملكين صلاحية عرضه"
      );

      return false;
    }


    currentId =
      row.id;


    loadedRecordOwnerId =
      row.created_by ||
      row.payload
        ?.owner_id ||
      null;


    loadedRecordOwnerEmail =
      row.payload
        ?.owner_email ||
      row.payload
        ?.ownerEmail ||
      (
        String(
          loadedRecordOwnerId ||
          ""
        ) ===
        String(
          currentUser?.id ||
          ""
        )
          ? (
              currentUser?.email ||
              ""
            )
          : ""
      );


    const payload = {
      ...(
        row.payload ||
        {}
      )
    };


    if (
      !payload.name
    ) {

      payload.name =
        payload.title ||
        row.title ||
        "";

    }


    if (
      !payload.date
    ) {

      payload.date =
        row.record_date ||
        "";

    }


    if (
      !payload.executor
    ) {

      payload.executor =
        payload.owner_name ||
        "";

    }


    remoteImagePaths =
      Array.isArray(
        row.image_paths
      )
        ? row.image_paths
        : Array.isArray(
            payload
              .image_paths
          )
          ? payload
              .image_paths
          : [];


    existingImageRefs =
      Array.isArray(
        payload
          .imageRefs
      )
        ? payload
            .imageRefs
        : [];


    applyValues(
      payload
    );


    $("executor").value =
      payload.executor ||
      payload.owner_name ||
      "";


    if (
      currentProfile
        ?.role ===
        "teacher" ||
      currentProfile
        ?.role ===
        "coordinator"
    ) {

      $("executor")
        .readOnly =
        true;

    } else {

      $("executor")
        .readOnly =
        false;

    }


    $("pageTitle")
      .textContent =
      "تعديل تقرير فعالية";


    $("draftState")
      .textContent =
      "تم تحميل التقرير المحفوظ من الأرشيف السحابي.";


    $("deleteBtn")
      .classList
      .remove(
        "hidden"
      );


    updatePreview();


    await renderImages();


    console.log(
      "Activity loaded from Supabase:",
      row
    );


    return true;

  } catch (error) {

    console.error(
      "خطأ تحميل التقرير:",
      error
    );


    wrToast(
      "تعذر تحميل التقرير: " +
      (
        error.message ||
        error
      )
    );


    return false;

  }
}


/* =========================================================
   إنشاء ID ثابت
   ========================================================= */

function createActivityId() {

  return (
    "rec_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .slice(
        2,
        8
      )
  );
}


/* =========================================================
   حفظ التقرير
   ========================================================= */

async function save() {

  syncActivityIndicators();


  if (
    !$("name")
      .value
      .trim() ||
    !$("executor")
      .value
      .trim() ||
    !$("date")
      .value
  ) {

    wrToast(
      "أكملي اسم الفعالية والتاريخ"
    );

    return;
  }


  $("saveBtn")
    .disabled =
    true;


  try {

    if (
      !currentId ||
      String(
        currentId
      ) ===
        "undefined" ||
      String(
        currentId
      ) ===
        "null"
    ) {

      currentId =
        createActivityId();

    }


    loadedRecordOwnerId =
      loadedRecordOwnerId ||
      currentUser?.id ||
      null;


    loadedRecordOwnerEmail =
      loadedRecordOwnerEmail ||
      currentUser?.email ||
      "";


    if (
      selectedFiles.length &&
      typeof WRGraph
        .uploadFiles ===
        "function"
    ) {

      try {

        const uploaded =
          await WRGraph
            .uploadFiles(
              currentId,
              selectedFiles
            );


        remoteImagePaths = [
          ...remoteImagePaths,
          ...uploaded
        ]
          .filter(
            (
              value,
              index,
              array
            ) =>
              array.indexOf(
                value
              ) ===
              index
          )
          .slice(
            0,
            10
          );

      } catch (
        uploadError
      ) {

        console.warn(
          "تعذر رفع الصور إلى Supabase:",
          uploadError
        );

      }

    }


    const data = {

      ...recordData(),

      id:
        currentId,

      image_paths:
        remoteImagePaths

    };


    let rec =
      null;


    try {

      rec =
        await wrAddRecord(
          data,
          selectedFiles
        );

    } catch (
      localSaveError
    ) {

      console.warn(
        "تعذر الحفظ المحلي:",
        localSaveError
      );

    }


    if (
      rec?.id &&
      String(
        rec.id
      ) !==
        "undefined" &&
      String(
        rec.id
      ) !==
        "null"
    ) {

      currentId =
        rec.id;

    }


    existingImageRefs =
      rec?.imageRefs ||
      existingImageRefs ||
      [];


    if (
      typeof WRGraph
        .uploadJson ===
        "function"
    ) {

      await WRGraph
        .uploadJson({

          ...recordData(),

          id:
            currentId,

          image_paths:
            remoteImagePaths

        });

    }


    selectedFiles =
      [];


    $("images").value =
      "";


    localStorage
      .removeItem(
        DRAFT_KEY
      );


    $("deleteBtn")
      .classList
      .remove(
        "hidden"
      );


    const cleanUrl =
      new URL(
        window.location
          .href
      );


    cleanUrl.search =
      "";


    cleanUrl
      .searchParams
      .set(
        "id",
        currentId
      );


    history
      .replaceState(
        null,
        "",
        cleanUrl
          .pathname +
        cleanUrl
          .search
      );


    $("pageTitle")
      .textContent =
      "تعديل تقرير فعالية";


    $("draftState")
      .textContent =
      "تم حفظ التقرير بنجاح.";


    await renderImages();


    wrToast(
      "تم حفظ التقرير بنجاح"
    );


    console.log(
      "Activity saved with ID:",
      currentId
    );


  } catch (error) {

    console.error(
      "Save error:",
      error
    );


    wrToast(
      "تعذر الحفظ: " +
      (
        error.message ||
        error
      )
    );

  } finally {

    $("saveBtn")
      .disabled =
      false;

  }
}
/* =========================================================
   تحويل Blob إلى Data URL
   ========================================================= */

function wrBlobToDataURL(
  blob
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () =>
          resolve(
            reader.result
          );


      reader.onerror =
        reject;


      reader
        .readAsDataURL(
          blob
        );

    }
  );
}


/* =========================================================
   تنزيل ملف
   ========================================================= */

function wrDownloadBlob(
  blob,
  fileName
) {

  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document
      .createElement(
        "a"
      );


  link.href =
    url;


  link.download =
    fileName;


  document.body
    .appendChild(
      link
    );


  link.click();


  link.remove();


  setTimeout(
    () => {

      URL
        .revokeObjectURL(
          url
        );

    },
    1000
  );
}


/* =========================================================
   اسم آمن للملف
   ========================================================= */

function wrSafeName(
  value
) {

  return String(
    value ||
    "تقرير فعالية"
  )
    .replace(
      /[\\/:*?"<>|]/g,
      "-"
    )
    .trim();
}


/* =========================================================
   إنشاء HTML
   ========================================================= */

function reportHtml() {

  const clone =
    $("reportSheet")
      .cloneNode(
        true
      );


  clone
    .querySelectorAll(
      "img"
    )
    .forEach(
      img => {

        if (
          img.src
            .startsWith(
              "blob:"
            )
        ) {

          img
            .setAttribute(
              "data-needs-inline",
              "1"
            );

        }

      }
    );


  return `
<!doctype html>

<html lang="ar" dir="rtl">

<head>

<meta charset="utf-8">

<title>
${wrSafeName(
  $("name").value
)}
</title>

<style>

body{
  font-family:Tahoma,Arial,sans-serif;
  background:#fff;
  margin:0;
  color:#24352e;
}

.sheet{
  max-width:190mm;
  margin:auto;
  padding:12mm;
}

.school-header{
  width:100%;
  max-height:100px;
  object-fit:contain;
}

.doc-title{
  text-align:center;
  border-top:3px solid #087451;
  border-bottom:1px solid #b58a36;
  padding:14px;
}

.doc-title h1{
  color:#075c40;
}

.summary{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.summary-item{
  padding:10px;
  background:#f5f8f6;
  border-right:4px solid #087451;
  border-radius:8px;
}

.doc-section h3{
  color:#075c40;
  border-bottom:2px solid #d8b668;
}

.doc-section p{
  white-space:pre-wrap;
  line-height:1.8;
}

.images-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.report-photo{
  margin:0;
  break-inside:avoid;
}

.report-photo img{
  width:100%;
  max-height:280px;
  object-fit:contain;
}

.empty{
  display:none;
}

.report-footer{
  text-align:center;
  margin-top:25px;
  color:#6b7a72;
  font-size:12px;
}

@media print{

  @page{
    size:A4;
    margin:10mm;
  }

}

</style>

</head>

<body>

${clone.outerHTML}

</body>

</html>
`;

}


/* =========================================================
   تنزيل HTML كامل بالصور
   ========================================================= */

async function downloadHtml() {

  const clone =
    $("reportSheet")
      .cloneNode(
        true
      );


  const originalImages = [
    ...$("reportSheet")
      .querySelectorAll(
        "img"
      )
  ];


  const clonedImages = [
    ...clone
      .querySelectorAll(
        "img"
      )
  ];


  for (
    let i = 0;
    i <
      originalImages.length;
    i++
  ) {

    try {

      const response =
        await fetch(
          originalImages[i]
            .src
        );


      const blob =
        await response
          .blob();


      clonedImages[i]
        .src =
        await wrBlobToDataURL(
          blob
        );


    } catch (error) {

      console.warn(
        "تعذر تضمين صورة في HTML:",
        error
      );

    }

  }


  const css = `

body{
  font-family:Tahoma,Arial,sans-serif;
  background:#fff;
  margin:0;
  color:#24352e;
}

.sheet{
  max-width:190mm;
  margin:auto;
  padding:12mm;
}

.school-header{
  width:100%;
  max-height:100px;
  object-fit:contain;
}

.doc-title{
  text-align:center;
  border-top:3px solid #087451;
  border-bottom:1px solid #b58a36;
  padding:14px;
}

.doc-title h1{
  color:#075c40;
}

.summary{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.summary-item{
  padding:10px;
  background:#f5f8f6;
  border-right:4px solid #087451;
  border-radius:8px;
}

.doc-section h3{
  color:#075c40;
  border-bottom:2px solid #d8b668;
}

.doc-section p{
  white-space:pre-wrap;
  line-height:1.8;
}

.images-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}

.report-photo{
  margin:0;
  break-inside:avoid;
}

.report-photo img{
  width:100%;
  max-height:280px;
  object-fit:contain;
}

.empty{
  display:none;
}

.report-footer{
  text-align:center;
  margin-top:25px;
  color:#6b7a72;
  font-size:12px;
}

@media print{

  @page{
    size:A4;
    margin:10mm;
  }

}

`;


  const html = `

<!doctype html>

<html lang="ar" dir="rtl">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width"
>

<title>
${wrSafeName(
  $("name").value
)}
</title>

<style>
${css}
</style>

</head>

<body>

${clone.outerHTML}

</body>

</html>
`;


  wrDownloadBlob(

    new Blob(
      [html],
      {
        type:
          "text/html;charset=utf-8"
      }
    ),

    `تقرير - ${wrSafeName(
      $("name").value
    )}.html`

  );


  wrToast(
    "تم تنزيل نسخة التقرير كاملة بالصور"
  );
}


/* =========================================================
   حذف التقرير
   ========================================================= */

async function deleteCurrentReport() {

  if (
    !currentId
  ) {

    wrToast(
      "لا يوجد تقرير محفوظ لحذفه"
    );

    return;
  }


  const ok =
    confirm(
      "حذف هذا التقرير وصوره من الأرشيف؟"
    );


  if (!ok) {
    return;
  }


  $("deleteBtn")
    .disabled =
    true;


  try {

    if (
      remoteImagePaths
        .length &&
      typeof WRGraph
        .deleteFiles ===
        "function"
    ) {

      try {

        await WRGraph
          .deleteFiles(
            remoteImagePaths
          );

      } catch (error) {

        console.warn(
          "تعذر حذف بعض الصور السحابية:",
          error
        );

      }

    }


    await WRGraph
      .deleteRecord(
        currentId
      );


    try {

      if (
        typeof wrDeleteRecord ===
          "function"
      ) {

        await wrDeleteRecord(
          currentId
        );

      }

    } catch (error) {

      console.warn(
        "تعذر تنظيف النسخة المحلية:",
        error
      );

    }


    wrToast(
      "تم حذف التقرير"
    );


    setTimeout(
      () => {

        location.href =
          "../archive/index.html";

      },
      400
    );


  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    wrToast(
      "تعذر حذف التقرير: " +
      (
        error.message ||
        error
      )
    );


    $("deleteBtn")
      .disabled =
      false;

  }
}


/* =========================================================
   بريد صاحبة التقرير
   ========================================================= */

function getReportOwnerEmail() {

  if (
    loadedRecordOwnerEmail
  ) {

    return loadedRecordOwnerEmail;

  }


  if (
    !loadedRecordOwnerId ||
    String(
      loadedRecordOwnerId
    ) ===
    String(
      currentUser?.id ||
      ""
    )
  ) {

    return (
      currentUser?.email ||
      ""
    );

  }


  return "";
}


/* =========================================================
   رابط التقرير
   ========================================================= */

function getCurrentReportLink() {

  if (
    !currentId ||
    String(
      currentId
    ) ===
      "undefined" ||
    String(
      currentId
    ) ===
      "null"
  ) {

    return "";
  }


  const url =
    new URL(
      window.location.href
    );


  url.search =
    "";


  url
    .searchParams
    .set(
      "id",
      currentId
    );


  return url
    .toString();
}


/* =========================================================
   إرسال التقرير بالبريد
   ========================================================= */

async function sendReportByEmail() {

  if (
    !currentId ||
    String(
      currentId
    ) ===
      "undefined" ||
    String(
      currentId
    ) ===
      "null"
  ) {

    wrToast(
      "احفظي التقرير أولًا ثم أرسليه بالبريد"
    );

    return;
  }


  const recipient =
    getReportOwnerEmail();


  if (
    !recipient
  ) {

    wrToast(
      "لا يوجد بريد إلكتروني محفوظ لصاحبة التقرير"
    );

    return;
  }


  const activityName =
    $("name")
      .value
      .trim() ||
    "تقرير فعالية";


  const executorName =
    $("executor")
      .value
      .trim() ||
    "المعلمة";


  const activityDate =
    $("date").value
      ? wrFormatDate(
          $("date").value
        )
      : "—";


  const reportLink =
    getCurrentReportLink();


  const pdfFileName =
    `تقرير - ${wrSafeName(
      activityName
    )} - ${wrSafeName(
      executorName
    )}.pdf`;


  const subject =
    `تقرير فعالية - ${activityName}`;


  const body = [

    `الأستاذة/ ${executorName}`,

    "",

    "تحية طيبة،",

    "",

    "هذه نسخة من تقرير الفعالية المسجل في منصة التوثيق الذكي لمدرسة الرفاع الغربي الابتدائية للبنين.",

    "",

    `اسم الفعالية: ${activityName}`,

    `التاريخ: ${activityDate}`,

    "",

    "رابط التقرير الإلكتروني:",

    reportLink,

    "",

    `اسم ملف التقرير: ${pdfFileName}`,

    "",

    "يرجى إرفاق ملف PDF المحفوظ مع هذه الرسالة.",

    "",

    "مع تحيات منصة التوثيق الذكي — الرفاع الغربي"

  ].join(
    "\n"
  );


  const outlookUrl =
    "https://outlook.office.com/mail/deeplink/compose" +
    "?to=" +
    encodeURIComponent(
      recipient
    ) +
    "&subject=" +
    encodeURIComponent(
      subject
    ) +
    "&body=" +
    encodeURIComponent(
      body
    );


  const outlookWindow =
    window.open(
      "about:blank",
      "_blank"
    );


  const oldTitle =
    document.title;


  document.title =
    pdfFileName.replace(
      /\.pdf$/i,
      ""
    );


  wrToast(
    "احفظي التقرير PDF، وبعدها ستفتح رسالة Outlook جاهزة."
  );


  window.print();


  document.title =
    oldTitle;


  if (
    outlookWindow
  ) {

    outlookWindow
      .location
      .href =
      outlookUrl;

  } else {

    window.open(
      outlookUrl,
      "_blank"
    );

  }
}


/* =========================================================
   الأزرار
   ========================================================= */

$("saveBtn").onclick =
  save;


$("htmlBtn").onclick =
  downloadHtml;


$("printBtn").onclick =
  () => {

    document.title =
      `تقرير - ${wrSafeName(
        $("name").value
      )}`;


    window.print();

  };


if (
  $("emailBtn")
) {

  $("emailBtn").onclick =
    sendReportByEmail;

}


$("deleteBtn").onclick =
  deleteCurrentReport;


$("newBtn").onclick =
  () => {

    if (
      confirm(
        "بدء تقرير جديد؟ سيتم مسح المسودة الحالية وفتح نموذج فارغ."
      )
    ) {

      localStorage
        .removeItem(
          DRAFT_KEY
        );


      location.href =
        "report.html?new=1";

    }

  };


/* =========================================================
   تشغيل الصفحة
   ========================================================= */

(async function init() {

  await loadCurrentProfile();


  /* الجديد: قراءة العام الدراسي النشط */
  try {

    if (
      window.WRGraph &&
      typeof WRGraph.getActiveSchoolYear ===
        "function"
    ) {

      currentSchoolYear =
        await WRGraph.getActiveSchoolYear();

    }

  } catch (error) {

    console.warn(
      "تعذر تحميل العام الدراسي:",
      error
    );

    currentSchoolYear =
      "";

  }


  const params =
    new URLSearchParams(
      location.search
    );


  const id =
    params.get(
      "id"
    );


  const forceNew =
    params.get(
      "new"
    ) ===
    "1";


  if (
    forceNew
  ) {

    localStorage
      .removeItem(
        DRAFT_KEY
      );


    history.replaceState(
      null,
      "",
      location.pathname
    );

  }


  const validId =
    id &&
    id !==
      "undefined" &&
    id !==
      "null";


  if (
    validId
  ) {

    await loadRecord(
      id
    );

    return;
  }


  loadedRecordOwnerId =
    currentUser?.id ||
    null;


  loadedRecordOwnerEmail =
    currentUser?.email ||
    "";


  let draft =
    null;


  if (
    !forceNew
  ) {

    try {

      draft =
        JSON.parse(
          localStorage
            .getItem(
              DRAFT_KEY
            ) ||
          "null"
        );


    } catch (error) {

      console.warn(
        "تعذر قراءة المسودة:",
        error
      );


      localStorage
        .removeItem(
          DRAFT_KEY
        );

    }

  }


  if (
    draft
  ) {

    applyValues(
      draft
    );


    $("draftState")
      .textContent =
      "تم استرجاع المسودة المحفوظة تلقائيًا.";


  } else {

    $("date").value =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );


    if (
      forceNew
    ) {

      $("draftState")
        .textContent =
        "نموذج جديد — تم مسح المسودة السابقة.";

    }

  }


  if (
    currentProfile
      ?.full_name
  ) {

    $("executor").value =
      currentProfile
        .full_name;


    if (
      currentProfile.role ===
        "teacher" ||
      currentProfile.role ===
        "coordinator"
    ) {

      $("executor")
        .readOnly =
        true;

    }

  }


  syncActivityIndicators();

  updatePreview();

})();