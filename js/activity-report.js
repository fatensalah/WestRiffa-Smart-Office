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
let existingImagePaths = [];


function values() {
  const o = {};

  FIELD_IDS.forEach(id => {
    o[id] = $(id).value;
  });

  return o;
}


function applyValues(o = {}) {
  FIELD_IDS.forEach(id => {
    if (
      o[id] !== undefined &&
      o[id] !== null
    ) {
      $(id).value = o[id];
    }
  });

  updatePreview();
}


function recordData() {
  return {
    type: "activity",

    title:
      $("name").value.trim() ||
      "تقرير فعالية",

    name:
      $("name").value.trim(),

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

    image_paths:
      [...existingImagePaths]
  };
}


function updatePreview() {
  const d = recordData();

  $("pName").textContent =
    d.title;

  $("pType").textContent =
    d.activityType || "—";

  $("pExecutor").textContent =
    d.executor || "—";

  $("pDepartment").textContent =
    d.department || "—";

  $("pDate").textContent =
    wrFormatDate(d.date);

  $("pTime").textContent =
    [
      wrFormatTime(d.startTime),
      wrFormatTime(d.endTime)
    ]
      .filter(x => x !== "—")
      .join(" – ") || "—";

  $("pPlace").textContent =
    d.place || "—";

  $("pTarget").textContent =
    d.target || "—";

  $("pCount").textContent =
    d.count || "—";

  $("pGoal").textContent =
    d.goal || "—";

  $("pImplementation").textContent =
    d.implementation || "—";

  $("pResults").textContent =
    d.results || "—";

  $("pRecommendations").textContent =
    d.recommendations || "—";

  $("pNotes").textContent =
    d.notes || "—";
}


function saveDraft() {
  if (currentId) return;

  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      ...values(),
      savedAt:
        new Date().toISOString()
    })
  );

  $("draftState").textContent =
    "تم حفظ المسودة تلقائيًا: " +
    new Date()
      .toLocaleTimeString("ar-BH");
}


let draftTimer;

FIELD_IDS.forEach(id => {
  $(id).addEventListener(
    "input",
    () => {
      updatePreview();

      clearTimeout(draftTimer);

      draftTimer =
        setTimeout(
          saveDraft,
          450
        );
    }
  );
});


async function renderImages() {
  const box = $("pImages");

  box.innerHTML = "";

  const sources = [];

  /*
   * الصور السحابية من Supabase Storage
   */
  for (const path of existingImagePaths) {
    try {
      const url =
        await WRGraph.getFileUrl(path);

      if (url) {
        sources.push({
          name: path.split("/").pop(),
          url,
          revoke: false
        });
      }
    } catch (e) {
      console.warn(
        "تعذر تحميل صورة سحابية:",
        path,
        e
      );
    }
  }

  /*
   * دعم الصور المحلية القديمة إن وجدت
   */
  for (const ref of existingImageRefs) {
    try {
      const f =
        await wrGetFile(ref);

      if (f) {
        sources.push({
          name: f.name,
          url:
            URL.createObjectURL(f.blob),
          revoke: true
        });
      }
    } catch (e) {
      console.warn(
        "تعذر تحميل صورة محلية:",
        e
      );
    }
  }

  /*
   * الصور الجديدة قبل الحفظ
   */
  for (const f of selectedFiles) {
    sources.push({
      name: f.name,
      url:
        URL.createObjectURL(f),
      revoke: true
    });
  }

  sources
    .slice(0, 10)
    .forEach(s => {
      const fig =
        document.createElement("figure");

      fig.className =
        "report-photo";

      const im =
        new Image();

      im.src = s.url;
      im.alt = s.name;

      im.onload = () => {
        if (s.revoke) {
          setTimeout(
            () =>
              URL.revokeObjectURL(s.url),
            5000
          );
        }
      };

      fig.appendChild(im);
      box.appendChild(fig);
    });

  $("noImages")
    .classList
    .toggle(
      "hidden",
      sources.length > 0
    );
}


$("images").addEventListener(
  "change",
  () => {
    selectedFiles =
      [...$("images").files]
        .slice(0, 10);

    $("imageHint").textContent =
      `تم اختيار ${selectedFiles.length} صورة`;

    renderImages();
  }
);


async function loadRecord(id) {
  try {
    const records =
      await WRGraph.fetchRecords();

    const rec =
      records.find(
        r =>
          String(r.id) ===
          String(id)
      );

    if (!rec) {
      alert(
        "لم يتم العثور على السجل"
      );

      return;
    }

    currentId = rec.id;

    const data = {
      ...(rec.payload || {})
    };

    if (!data.name && rec.title) {
      data.name = rec.title;
    }

    if (
      !data.date &&
      rec.record_date
    ) {
      data.date =
        rec.record_date;
    }

    if (!data.activityType) {
      data.activityType =
        rec.type === "activity"
          ? "فعالية"
          : rec.type || "فعالية";
    }

    existingImagePaths =
      Array.isArray(rec.image_paths)
        ? [...rec.image_paths]
        : Array.isArray(
            data.image_paths
          )
          ? [...data.image_paths]
          : [];

    existingImageRefs =
      Array.isArray(data.imageRefs)
        ? [...data.imageRefs]
        : [];

    applyValues(data);

    $("deleteBtn")
      .classList
      .remove("hidden");

    $("pageTitle").textContent =
      "تعديل تقرير فعالية";

    await renderImages();

    console.log(
      "تم استرجاع السجل:",
      rec
    );

  } catch (error) {
    console.error(
      "خطأ في استرجاع السجل:",
      error
    );

    alert(
      "حدث خطأ أثناء استرجاع السجل"
    );
  }
}


async function save() {
  if (
    !$("name").value.trim() ||
    !$("executor").value.trim() ||
    !$("date").value
  ) {
    wrToast(
      "أكملي اسم الفعالية والمنفذ والتاريخ"
    );

    return;
  }

  $("saveBtn").disabled = true;

  try {
    /*
     * نحدد ID قبل رفع الصور حتى يكون
     * لكل تقرير مجلد ثابت في Storage.
     */
    if (!currentId) {
      currentId =
        "rec_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .slice(2, 8);
    }

    /*
     * رفع الصور الجديدة فقط.
     */
    if (selectedFiles.length) {
      $("imageHint").textContent =
        "جارٍ رفع الصور إلى السحابة...";

      const newPaths =
        await WRGraph.uploadFiles(
          currentId,
          selectedFiles
        );

      existingImagePaths = [
        ...existingImagePaths,
        ...newPaths
      ].slice(0, 10);
    }

    const dataToSave = {
      ...recordData(),

      id: currentId,

      image_paths:
        [...existingImagePaths]
    };

    /*
     * نحافظ على نظام الحفظ الحالي المحلي
     * ثم المزامنة مع Supabase.
     * لا نرسل الصور مرة أخرى إلى IndexedDB.
     */
    const rec =
      await wrAddRecord(
        dataToSave,
        []
      );

    currentId =
      rec.id || currentId;

    existingImageRefs =
      rec.imageRefs || [];

    selectedFiles = [];

    $("images").value = "";

    localStorage.removeItem(
      DRAFT_KEY
    );

    $("deleteBtn")
      .classList
      .remove("hidden");

    history.replaceState(
      null,
      "",
      `?id=${encodeURIComponent(currentId)}`
    );

    $("pageTitle").textContent =
      "تعديل تقرير فعالية";

    $("imageHint").textContent =
      existingImagePaths.length
        ? `تم حفظ ${existingImagePaths.length} صورة في السحابة`
        : "لم تُضف صور";

    await renderImages();

    wrToast(
      "تم حفظ التقرير والصور بنجاح"
    );

  } catch (e) {
    console.error(e);

    wrToast(
      "تعذر الحفظ: " +
      (e.message || e)
    );

  } finally {
    $("saveBtn").disabled = false;
  }
}


function reportHtml() {
  const clone =
    $("reportSheet")
      .cloneNode(true);

  clone
    .querySelectorAll("img")
    .forEach(img => {
      if (
        img.src.startsWith("blob:")
      ) {
        img.setAttribute(
          "data-needs-inline",
          "1"
        );
      }
    });

  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${wrSafeName(
    $("name").value
  )}</title>
</head>
<body>
${clone.outerHTML}
</body>
</html>
`;
}


async function downloadHtml() {
  const clone =
    $("reportSheet")
      .cloneNode(true);

  const originalImages = [
    ...$("reportSheet")
      .querySelectorAll("img")
  ];

  const clonedImages = [
    ...clone
      .querySelectorAll("img")
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
        await wrBlobToDataURL(blob);

    } catch (e) {
      console.warn(
        "تعذر تضمين صورة في HTML:",
        e
      );
    }
  }

  const css = `
body{
  font-family:Tahoma,Arial,sans-serif;
  background:#fff;
  margin:0;
  color:#24352e
}
.sheet{
  max-width:190mm;
  margin:auto;
  padding:12mm
}
.school-header{
  width:100%;
  max-height:100px;
  object-fit:contain
}
.doc-title{
  text-align:center;
  border-top:3px solid #087451;
  border-bottom:1px solid #b58a36;
  padding:14px
}
.doc-title h1{
  color:#075c40
}
.summary{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px
}
.summary-item{
  padding:10px;
  background:#f5f8f6;
  border-right:4px solid #087451;
  border-radius:8px
}
.doc-section h3{
  color:#075c40;
  border-bottom:2px solid #d8b668
}
.doc-section p{
  white-space:pre-wrap;
  line-height:1.8
}
.images-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px
}
.report-photo{
  margin:0;
  break-inside:avoid
}
.report-photo img{
  width:100%;
  max-height:280px;
  object-fit:contain
}
.empty{
  display:none
}
.report-footer{
  text-align:center;
  margin-top:25px;
  color:#6b7a72;
  font-size:12px
}
@media print{
  @page{
    size:A4;
    margin:10mm
  }
}
`;

  const html = `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>${wrSafeName(
    $("name").value
  )}</title>
<style>${css}</style>
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


$("saveBtn").onclick = save;

$("htmlBtn").onclick =
  downloadHtml;

$("printBtn").onclick = () => {
  document.title =
    `تقرير - ${wrSafeName(
      $("name").value
    )}`;

  window.print();
};


$("deleteBtn").onclick =
  async () => {
    if (
      !confirm(
        "حذف هذا التقرير وصوره من الأرشيف؟"
      )
    ) {
      return;
    }

    try {
      if (
        existingImagePaths.length
      ) {
        await WRGraph.deleteFiles(
          existingImagePaths
        );
      }
    } catch (e) {
      console.warn(
        "تعذر حذف بعض الصور:",
        e
      );
    }

    await wrDeleteRecord(currentId);

    location.href =
      "../archive/index.html";
  };


$("newBtn").onclick = () => {
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


(async function init() {
  const id =
    new URLSearchParams(
      location.search
    ).get("id");

  if (id) {
    await loadRecord(id);

  } else {
    const draft =
      JSON.parse(
        localStorage.getItem(
          DRAFT_KEY
        ) || "null"
      );

    if (draft) {
      applyValues(draft);

      $("draftState").textContent =
        "تم استرجاع المسودة المحفوظة تلقائيًا.";

    } else {
      $("date").value =
        new Date()
          .toISOString()
          .slice(0, 10);

      updatePreview();
    }
  }
})();