const FIELD_IDS = [
  "name",
  "activityType",
  "executor",
  "department",
  "date",
  "startTime",
  "endTime",
  "place",
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

let loadedRecordOwnerId = null;


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

      console.warn(
        "WRGraph غير متاح"
      );

      return null;

    }


    currentUser =
      await WRGraph.getAccount();


    if (!currentUser) {

      console.warn(
        "لا يوجد مستخدم مسجل الدخول"
      );

      return null;

    }


    const sb =
      getActivitySupabase();


    const {
      data,
      error
    } = await sb
      .from("profiles")
      .select(
        "id, full_name, role"
      )
      .eq(
        "id",
        currentUser.id
      )
      .single();


    if (error) {

      console.error(
        "Profile error:",
        error
      );

      return null;

    }


    currentProfile =
      data;


    /*
      هذا الاسم يستخدم عند إنشاء
      تقرير جديد فقط.

      عند فتح تقرير محفوظ
      سيتم استبداله ببيانات
      صاحب التقرير الأصلي.
    */

    if (
      currentProfile?.full_name
    ) {

      $("executor").value =
        currentProfile.full_name;


      if (
        currentProfile.role ===
        "teacher"
      ) {

        $("executor").readOnly =
          true;


        $("executor").title =
          "يتم تحديد اسم المنفذ تلقائيًا من الحساب المسجل";

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
   قراءة قيم النموذج
   ========================================================= */

function values() {

  const data = {};


  FIELD_IDS.forEach(
    id => {

      data[id] =
        $(id).value;

    }
  );


  return data;

}


/* =========================================================
   تعبئة النموذج
   ========================================================= */

function applyValues(
  data = {}
) {

  FIELD_IDS.forEach(
    id => {

      if (
        data[id] !== undefined &&
        data[id] !== null
      ) {

        $(id).value =
          data[id];

      }

    }
  );


  updatePreview();

}


/* =========================================================
   بيانات التقرير
   ========================================================= */

function recordData() {

  return {

    type:
      "activity",

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


  localStorage.setItem(

    DRAFT_KEY,

    JSON.stringify({

      ...values(),

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


FIELD_IDS.forEach(
  id => {

    $(id).addEventListener(
      "input",
      () => {

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
   محلية + Supabase
   ========================================================= */

async function renderImages() {

  const box =
    $("pImages");


  box.innerHTML =
    "";


  const sources = [];


  /*
    الصور المحلية القديمة
  */

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

    } catch (
      error
    ) {

      console.warn(
        "تعذر قراءة صورة محلية:",
        error
      );

    }

  }


  /*
    الصور الموجودة في Supabase Storage
  */

  for (
    const path of
    remoteImagePaths
  ) {

    try {

      const url =
        await WRGraph.getFileUrl(
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

    } catch (
      error
    ) {

      console.warn(
        "تعذر تحميل صورة من Supabase:",
        error
      );

    }

  }


  /*
    الصور المختارة الآن
  */

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
          document.createElement(
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

                  URL.revokeObjectURL(
                    source.url
                  );

                },
                5000
              );

            }

          };


        figure.appendChild(
          image
        );


        box.appendChild(
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

$("images").addEventListener(
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


    $("imageHint").textContent =
      `تم اختيار ${selectedFiles.length} صورة`;


    renderImages();

  }
);


/* =========================================================
   تحميل تقرير محفوظ من Supabase
   ========================================================= */

async function loadRecord(id) {

  try {

    /*
      نقرأ السجل مباشرة من Supabase
      وليس من التخزين المحلي.
    */

    const records =
      await WRGraph.fetchRecords();


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
      row.payload?.owner_id ||
      null;


    /*
      البيانات الحقيقية محفوظة داخل payload
    */

    const payload = {

      ...(row.payload || {})

    };


    /*
      احتياطًا للسجلات القديمة
    */

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


    /*
      اسم المنفذ الأصلي للتقرير.
      مهم جدًا:
      لا نستبدله باسم الـ Admin.
    */

    if (
      !payload.executor
    ) {

      payload.executor =
        payload.owner_name ||
        "";

    }


    /*
      الصور السحابية
    */

    remoteImagePaths =
      Array.isArray(
        row.image_paths
      )
        ? row.image_paths
        : Array.isArray(
            payload.image_paths
          )
          ? payload.image_paths
          : [];


    /*
      الصور المحلية لو التقرير
      تم إنشاؤه على نفس الجهاز
    */

    existingImageRefs =
      Array.isArray(
        payload.imageRefs
      )
        ? payload.imageRefs
        : [];


    /*
      تعبئة كل الحقول
    */

    applyValues(
      payload
    );


    /*
      لا نغير اسم المنفذ
      بعد تحميل التقرير.
    */

    $("executor").value =
      payload.executor ||
      payload.owner_name ||
      "";


    /*
      المعلمة لا تغير اسمها
      في تقريرها.
    */

    if (
      currentProfile?.role ===
      "teacher"
    ) {

      $("executor").readOnly =
        true;

    } else {

      $("executor").readOnly =
        false;

    }


    $("pageTitle").textContent =
      "تعديل تقرير فعالية";


    $("draftState").textContent =
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
   حفظ التقرير
   ========================================================= */

async function save() {

  if (
    !$("name").value.trim() ||
    !$("executor").value.trim() ||
    !$("date").value
  ) {

    wrToast(
      "أكملي اسم الفعالية والتاريخ"
    );


    return;

  }


  $("saveBtn").disabled =
    true;


  try {

    /*
      لو فيه صور جديدة
      نرفعها أيضًا إلى Supabase Storage.
    */

    if (
      selectedFiles.length &&
      currentId &&
      typeof WRGraph.uploadFiles ===
        "function"
    ) {

      try {

        const uploaded =
          await WRGraph.uploadFiles(
            currentId,
            selectedFiles
          );


        remoteImagePaths = [
          ...remoteImagePaths,
          ...uploaded
        ]
          .slice(
            0,
            10
          );


      } catch (
        uploadError
      ) {

        console.warn(
          "تعذر رفع الصور إلى Supabase، سيستمر الحفظ المحلي:",
          uploadError
        );

      }

    }


    const data = {

      ...recordData(),

      id:
        currentId ||
        undefined,

      image_paths:
        remoteImagePaths

    };


    const rec =
      await wrAddRecord(
        data,
        selectedFiles
      );


    currentId =
      rec.id;


    existingImageRefs =
      rec.imageRefs ||
      [];


    /*
      لو كان التقرير جديدًا
      نرفع الصور بعد معرفة ID.
    */

    if (
      selectedFiles.length &&
      remoteImagePaths.length === 0 &&
      typeof WRGraph.uploadFiles ===
        "function"
    ) {

      try {

        remoteImagePaths =
          await WRGraph.uploadFiles(
            currentId,
            selectedFiles
          );


        /*
          نعيد حفظ JSON ومعه
          مسارات الصور السحابية.
        */

        await WRGraph.uploadJson({

          ...data,

          id:
            currentId,

          image_paths:
            remoteImagePaths

        });


      } catch (
        uploadError
      ) {

        console.warn(
          "تعذر رفع الصور إلى Supabase:",
          uploadError
        );

      }

    }


    selectedFiles =
      [];


    $("images").value =
      "";


    localStorage.removeItem(
      DRAFT_KEY
    );


    $("deleteBtn")
      .classList
      .remove(
        "hidden"
      );


    history.replaceState(

      null,

      "",

      `?id=${encodeURIComponent(
        currentId
      )}`

    );


    $("pageTitle").textContent =
      "تعديل تقرير فعالية";


    $("draftState").textContent =
      "تم حفظ التقرير بنجاح.";


    await renderImages();


    wrToast(
      "تم حفظ التقرير بنجاح"
    );


  } catch (error) {

    console.error(
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

    $("saveBtn").disabled =
      false;

  }

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
          img.src.startsWith(
            "blob:"
          )
        ) {

          img.setAttribute(
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
    i < originalImages.length;
    i++
  ) {

    try {

      const blob =
        await (
          await fetch(
            originalImages[i].src
          )
        ).blob();


      clonedImages[i].src =
        await wrBlobToDataURL(
          blob
        );


    } catch (
      error
    ) {

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

  if (!currentId) {

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


  $("deleteBtn").disabled =
    true;


  try {

    /*
      حذف الصور السحابية
    */

    if (
      remoteImagePaths.length &&
      typeof WRGraph.deleteFiles ===
        "function"
    ) {

      try {

        await WRGraph.deleteFiles(
          remoteImagePaths
        );

      } catch (
        error
      ) {

        console.warn(
          "تعذر حذف بعض الصور السحابية:",
          error
        );

      }

    }


    /*
      حذف السجل من Supabase
    */

    await WRGraph.deleteRecord(
      currentId
    );


    /*
      تنظيف النسخة المحلية
    */

    try {

      if (
        typeof wrDeleteRecord ===
        "function"
      ) {

        await wrDeleteRecord(
          currentId
        );

      }

    } catch (
      error
    ) {

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


    $("deleteBtn").disabled =
      false;

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


$("deleteBtn").onclick =
  deleteCurrentReport;


$("newBtn").onclick =
  () => {

    if (
      confirm(
        "بدء تقرير جديد؟"
      )
    ) {

      localStorage.removeItem(
        DRAFT_KEY
      );


      location.href =
        "report.html";

    }

  };


/* =========================================================
   تشغيل الصفحة
   ========================================================= */

(async function init() {

  /*
    أولًا نعرف من المستخدم الحالي.
  */

  await loadCurrentProfile();


  const id =
    new URLSearchParams(
      location.search
    ).get(
      "id"
    );


  /* =======================================================
     فتح تقرير موجود
     ======================================================= */

  if (id) {

    /*
      أهم تغيير:
      التقرير سيأتي من Supabase
      وليس من LocalStorage.
    */

    await loadRecord(
      id
    );


    /*
      لا نضع اسم المستخدم الحالي هنا.
      بيانات التقرير الأصلية لها الأولوية.
    */

    return;

  }


  /* =======================================================
     تقرير جديد
     ======================================================= */

  const draft =
    JSON.parse(
      localStorage.getItem(
        DRAFT_KEY
      ) ||
      "null"
    );


  if (draft) {

    applyValues(
      draft
    );


    $("draftState").textContent =
      "تم استرجاع المسودة المحفوظة تلقائيًا.";

  } else {

    $("date").value =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

  }


  /*
    اسم المنفذ التلقائي
    يستخدم فقط في التقرير الجديد.
  */

  if (
    currentProfile?.full_name
  ) {

    $("executor").value =
      currentProfile.full_name;


    if (
      currentProfile.role ===
      "teacher"
    ) {

      $("executor").readOnly =
        true;

    }

  }


  updatePreview();

})();