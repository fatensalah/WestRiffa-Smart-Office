"use strict";

const plansSupabase = window.supabase.createClient(
  window.WR_CONFIG.supabaseUrl,
  window.WR_CONFIG.supabaseKey
);

const departmentSelect = document.getElementById("departmentSelect");
const schoolYear = document.getElementById("schoolYear");
const planFile = document.getElementById("planFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const resetBtn = document.getElementById("resetBtn");
const savePlanBtn = document.getElementById("savePlanBtn");
const uploadStatus = document.getElementById("uploadStatus");
const previewSection = document.getElementById("previewSection");
const previewBody = document.getElementById("previewBody");
const validationWarnings = document.getElementById("validationWarnings");
const totalRows = document.getElementById("totalRows");
const validRows = document.getElementById("validRows");
const invalidRows = document.getElementById("invalidRows");
const domainsCount = document.getElementById("domainsCount");

let analyzedProcedures = [];

const MONTHS = [
  { name: "سبتمبر", number: 9 },
  { name: "أكتوبر", number: 10 },
  { name: "نوفمبر", number: 11 },
  { name: "ديسمبر", number: 12 },
  { name: "يناير", number: 1 },
  { name: "فبراير", number: 2 },
  { name: "مارس", number: 3 },
  { name: "أبريل", number: 4 },
  { name: "مايو", number: 5 },
  { name: "يونيو", number: 6 }
];

const VALID_PATH_CODES = new Set([
  "P01","P02","P03","P04","P05","P06","P07","P08","P09",
  "P10","P11","P12","P13","P14","P15","P16","P17"
]);

document.addEventListener("DOMContentLoaded", async () => {
  await loadDepartments();
});

async function loadDepartments() {
  try {
    departmentSelect.innerHTML =
      `<option value="">جاري تحميل الأقسام...</option>`;

    const { data, error } = await plansSupabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;

    departmentSelect.innerHTML =
      `<option value="">اختاري القسم</option>`;

    if (!data || data.length === 0) {
      departmentSelect.innerHTML +=
        `<option value="">لا توجد أقسام</option>`;
      return;
    }

    data.forEach((department) => {
      const option = document.createElement("option");
      option.value = department.id;
      option.textContent = department.name;
      departmentSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Departments load error:", error);

    departmentSelect.innerHTML =
      `<option value="">تعذر تحميل الأقسام</option>`;

    showStatus(
      "تعذر تحميل الأقسام من قاعدة البيانات.",
      "error"
    );
  }
}

analyzeBtn.addEventListener("click", analyzePlanFile);

async function analyzePlanFile() {
  clearAnalysis();

  const selectedDepartment = departmentSelect.value;
  const selectedFile = planFile.files[0];

  if (!selectedDepartment) {
    showStatus("اختاري القسم أولًا.", "error");
    return;
  }

  if (!selectedFile) {
    showStatus("اختاري ملف الخطة السنوية أولًا.", "error");
    return;
  }

  const fileName = selectedFile.name.toLowerCase();

  if (
    !fileName.endsWith(".xlsx") &&
    !fileName.endsWith(".xls")
  ) {
    showStatus("الملف يجب أن يكون بصيغة Excel.", "error");
    return;
  }

  showStatus("جاري قراءة وفحص الخطة...", "info");

  try {
    const arrayBuffer = await selectedFile.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: "array"
    });

    let sheetName;

    if (workbook.SheetNames.includes("رفع الخطة")) {
      sheetName = "رفع الخطة";
    } else {
      sheetName = workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(
      worksheet,
      {
        range: 3,
        defval: "",
        raw: false
      }
    );

    if (!rows.length) {
      throw new Error(
        "لم يتم العثور على إجراءات داخل الملف."
      );
    }

    analyzedProcedures = parsePlanRows(rows);

    renderAnalysis(analyzedProcedures);

  } catch (error) {
    console.error("Excel analysis error:", error);

    showStatus(
      error.message || "حدث خطأ أثناء قراءة ملف Excel.",
      "error"
    );
  }
}

function parsePlanRows(rows) {
  const result = [];

  rows.forEach((row, index) => {
    const procedureText = cleanText(row["الإجراء"]);
    const pathCode = cleanText(row["كود المسار"]).toUpperCase();

    if (!procedureText && !pathCode) {
      return;
    }

    const errors = [];

    if (!pathCode) {
      errors.push("كود المسار غير محدد");
    } else if (!VALID_PATH_CODES.has(pathCode)) {
      errors.push("كود المسار غير صحيح");
    }

    if (!procedureText) {
      errors.push("الإجراء غير مكتوب");
    }

    const plannedMonths = [];

    MONTHS.forEach((month) => {
      const value = cleanText(row[month.name]);

      if (isMarkedMonth(value)) {
        plannedMonths.push(month.number);
      }
    });

    if (plannedMonths.length === 0) {
      errors.push("لم يتم تحديد شهر تنفيذ");
    }

    result.push({
      excelRow: index + 5,
      pathCode,
      domain: cleanText(row["المجال"]),
      generalGoal: cleanText(row["الهدف العام"]),
      specificGoal: cleanText(row["الهدف الخاص"]),
      successCriterion: cleanText(row["معيار النجاح"]),
      program: cleanText(row["البرنامج / المشروع"]),
      procedureText,
      targetGroup: cleanText(row["الفئة المستهدفة"]),
      implementers: cleanText(row["المنفذون"]),
      executionFollower: cleanText(row["متابع التنفيذ"]),
      evaluationMethods: cleanText(row["أساليب التقويم"]),
      notes: cleanText(row["ملاحظات"]),
      plannedMonths,
      errors,
      valid: errors.length === 0
    });
  });

  return result;
}

function isMarkedMonth(value) {
  if (!value) return false;

  const normalized = String(value)
    .trim()
    .toLowerCase();

  return [
    "✓",
    "✔",
    "نعم",
    "yes",
    "x",
    "1"
  ].includes(normalized);
}

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function renderAnalysis(procedures) {
  previewBody.innerHTML = "";

  const total = procedures.length;
  const valid = procedures.filter(item => item.valid).length;
  const invalid = total - valid;

  const domains = new Set(
    procedures
      .map(item => item.domain)
      .filter(Boolean)
  );

  totalRows.textContent = total;
  validRows.textContent = valid;
  invalidRows.textContent = invalid;
  domainsCount.textContent = domains.size;

  procedures.forEach((item, index) => {
    const tr = document.createElement("tr");

    if (!item.valid) {
      tr.classList.add("error-row");
    }

    const months = item.plannedMonths
      .map(monthNumberToName)
      .join("، ");

    const statusHtml = item.valid
      ? `<span style="color:#16733e;font-weight:bold;">✓ سليم</span>`
      : `<span style="color:#a52424;font-weight:bold;">
          ${escapeHtml(item.errors.join(" - "))}
        </span>`;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(item.domain || "—")}</td>
      <td>${escapeHtml(item.program || "—")}</td>
      <td>${escapeHtml(item.procedureText || "—")}</td>
      <td>${escapeHtml(item.targetGroup || "—")}</td>
      <td>${escapeHtml(item.implementers || "—")}</td>
      <td>${escapeHtml(item.executionFollower || "—")}</td>
      <td>${escapeHtml(months || "—")}</td>
      <td>${statusHtml}</td>
    `;

    previewBody.appendChild(tr);
  });

  if (invalid > 0) {
    const invalidItems =
      procedures.filter(item => !item.valid);

    validationWarnings.innerHTML = `
      <div
        style="
          background:#fff3f3;
          border:1px solid #efcccc;
          padding:16px;
          border-radius:12px;
          margin-bottom:18px;
        "
      >
        <strong style="color:#9b1c1c;">
          توجد ${invalid} إجراءات تحتاج مراجعة
        </strong>

        <ul class="warning-list">
          ${
            invalidItems
              .slice(0, 15)
              .map(
                item => `
                  <li>
                    صف Excel رقم ${item.excelRow}:
                    ${escapeHtml(item.errors.join("، "))}
                  </li>
                `
              )
              .join("")
          }
        </ul>
      </div>
    `;

    savePlanBtn.disabled = true;

    showStatus(
      `تم فحص الخطة: ${valid} إجراء سليم، و${invalid} إجراء يحتاج مراجعة.`,
      "error"
    );

  } else {
    validationWarnings.innerHTML = "";
    savePlanBtn.disabled = total === 0;

    showStatus(
      `تم فحص الخطة بنجاح. جميع الإجراءات وعددها ${total} سليمة وجاهزة للاعتماد.`,
      "success"
    );
  }

  previewSection.classList.remove("hidden");

  previewSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function monthNumberToName(number) {
  const month = MONTHS.find(
    item => item.number === number
  );

  return month ? month.name : String(number);
}

resetBtn.addEventListener(
  "click",
  resetUploadForm
);

function resetUploadForm() {
  planFile.value = "";
  analyzedProcedures = [];
  clearAnalysis();
  hideStatus();
}

function clearAnalysis() {
  previewBody.innerHTML = "";
  validationWarnings.innerHTML = "";

  totalRows.textContent = "0";
  validRows.textContent = "0";
  invalidRows.textContent = "0";
  domainsCount.textContent = "0";

  savePlanBtn.disabled = true;

  previewSection.classList.add("hidden");
}

savePlanBtn.addEventListener(
  "click",
  saveApprovedPlan
);

async function saveApprovedPlan() {
  const selectedDepartment = departmentSelect.value;
  const selectedFile = planFile.files[0];
  const selectedSchoolYear = schoolYear.value;

  if (!selectedDepartment) {
    showStatus("اختاري القسم أولًا.", "error");
    return;
  }

  if (!selectedSchoolYear) {
    showStatus("اختاري السنة الدراسية أولًا.", "error");
    return;
  }

  if (!selectedFile) {
    showStatus("اختاري ملف الخطة السنوية أولًا.", "error");
    return;
  }

  if (!analyzedProcedures.length) {
    showStatus("يجب فحص الخطة أولًا قبل اعتمادها.", "error");
    return;
  }

  const invalidItems =
    analyzedProcedures.filter(item => !item.valid);

  if (invalidItems.length > 0) {
    showStatus(
      `لا يمكن اعتماد الخطة. يوجد ${invalidItems.length} إجراء يحتاج مراجعة.`,
      "error"
    );
    return;
  }

  savePlanBtn.disabled = true;

  showStatus(
    "جاري اعتماد وحفظ الخطة في قاعدة البيانات...",
    "info"
  );

  let createdPlanId = null;

  try {
    const departmentName =
      departmentSelect.options[
        departmentSelect.selectedIndex
      ]?.textContent?.trim() || "";

    const { data: planData, error: planError } =
      await plansSupabase
        .from("plans")
        .insert({
          department_id: selectedDepartment,
          school_year: selectedSchoolYear,
          plan_title:
            `الخطة السنوية - ${departmentName} - ${selectedSchoolYear}`,
          status: "approved",
          source_file_name: selectedFile.name
        })
        .select("id")
        .single();

    if (planError) {
      throw planError;
    }

    createdPlanId = planData.id;

    const procedureRows =
      analyzedProcedures.map((item, index) => ({
        plan_id: createdPlanId,

        sequence_no: index + 1,

        path_code:
          item.pathCode || null,

        general_goal:
          item.generalGoal || null,

        specific_goal:
          item.specificGoal || null,

        success_criterion:
          item.successCriterion || null,

        program_name:
          item.program || null,

        objective:
          item.specificGoal ||
          item.generalGoal ||
          null,

        procedure_text:
          item.procedureText,

        target_group:
          item.targetGroup || null,

        implementers:
          item.implementers || null,

        responsible_person:
          item.implementers || null,

        execution_follower:
          item.executionFollower || null,

        evaluation_methods:
          item.evaluationMethods || null,

        planned_months:
          item.plannedMonths,

        notes:
          item.notes || null
      }));

    const {
      error: proceduresError
    } = await plansSupabase
      .from("plan_procedures")
      .insert(procedureRows);

    if (proceduresError) {
      throw proceduresError;
    }

    showStatus(
      `تم اعتماد وحفظ الخطة بنجاح. تم حفظ ${procedureRows.length} إجراء.`,
      "success"
    );

  } catch (error) {
    console.error(
      "Plan save error:",
      error
    );

    /*
      إذا نجح إنشاء الخطة
      وفشل حفظ الإجراءات
      نحذف الخطة التجريبية
      حتى لا يبقى سجل ناقص.
    */
    if (createdPlanId) {
      try {
        await plansSupabase
          .from("plan_procedures")
          .delete()
          .eq("plan_id", createdPlanId);

        await plansSupabase
          .from("plans")
          .delete()
          .eq("id", createdPlanId);

      } catch (cleanupError) {
        console.error(
          "Plan cleanup error:",
          cleanupError
        );
      }
    }

    showStatus(
      `تعذر حفظ الخطة: ${
        error.message ||
        "حدث خطأ غير متوقع."
      }`,
      "error"
    );

    savePlanBtn.disabled = false;
  }
}

function showStatus(message, type = "info") {
  uploadStatus.className =
    `status ${type}`;

  uploadStatus.textContent =
    message;
}

function hideStatus() {
  uploadStatus.className = "status";
  uploadStatus.textContent = "";
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}