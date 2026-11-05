"use strict";
/* =========================================================
   WestRiffa Smart Office
   Activity Documentation - FINAL RPC
   ========================================================= */
const byId = id => document.getElementById(id);
const DRAFT_KEY = "wr_activity_documentation_final_v1";
let currentId = null;
let currentUser = null;
let currentProfile = null;
let currentSchoolYear = "";
let selectedFiles = [];
let remoteImagePaths = [];
let loadedRecordOwnerId = null;
let loadedRecordOwnerName = "";
const imageUrlCache = new Map();
let activityUsers = [];
let departments = [];
let selectedCoExecutorIds = [];
/* =========================================================
   المجالات الرسمية
   ========================================================= */
const ACTIVITY_DOMAIN_LABELS = {
  achievement:
    "إنجاز الطلبة الأكاديمي",
  teaching_learning_assessment:
    "التعليم والتعلم والتقويم",
  personal_development:
    "التطور الشخصي للطلبة ورعايتهم",
  leadership_management:
    "القيادة والإدارة والحوكمة"
};
/* =========================================================
   المشاريع الرسمية
   ========================================================= */
const SCHOOL_PROJECT_MAP = {
  achievement: [
    "آفاق الإتقان",
    "آفاق المهارات",
    "آفاق المستقبل",
    "آفاق وطنية",
    "آفاق كتابية"
  ],
  teaching_learning_assessment: [
    "مداد الاستراتيجيات",
    "مداد التخطيط",
    "مداد التقويم",
    "مداد الدعم"
  ],
  personal_development: [
    "رايات التحدي",
    "رايات السلوك الواعي",
    "رايات الاستدامة"
  ],
  leadership_management: [
    "خطى التقييم والتطوير",
    "خطى نحو التميز",
    "خطى الشراكة",
    "خطى الأمان",
    "خطى الابتكار"
  ]
};
/* =========================================================
   أنواع التوثيق
   ========================================================= */
const ACTIVITY_CATEGORY_MAP = {
  achievement: [
    "دعم وعلاج",
    "إثراء",
    "برنامج طلابي",
    "مشروع طلابي",
    "مبادرة طلابية",
    "مهارات أكاديمية",
    "التحصيل والإنجاز الأكاديمي",
    "المسابقات الطلابية",
    "المواهب والإبداعات الطلابية",
    "المشاركات الطلابية الداخلية",
    "المشاركات الطلابية الخارجية",
    "الجوائز والتكريمات الطلابية",
    "اختبار وقياس وتشخيص",
    "متابعة تقدم الطلبة",
    "أخرى"
  ],
  teaching_learning_assessment: [
    "استراتيجيات التعليم والتعلم",
    "التعلم النشط",
    "التخطيط للتعليم والتعلم",
    "التقويم والاستفادة من نتائجه",
    "الدعم والعلاج",
    "الإثراء",
    "توظيف التقنية",
    "القراءة والبحث",
    "توظيف مركز مصادر التعلم",
    "ممارسات ودروس تطبيقية",
    "تبادل خبرات وزيارات تبادلية",
    "مجتمع تعلم مهني وورشة تطبيقية",
    "أخرى"
  ],
  personal_development: [
    "القيم والسلوك",
    "المواطنة والانتماء",
    "المهارات الشخصية والاجتماعية",
    "المسؤولية والقيادة الطلابية",
    "اللجان الطلابية",
    "التوعية والإرشاد",
    "الأنشطة والفعاليات الطلابية",
    "المشاركة المجتمعية",
    "المبادرات الطلابية",
    "دعم ورعاية فردية أو جماعية",
    "تكريم وتحفيز طلابي",
    "أخرى"
  ],
  leadership_management: [
    "تطوير الأداء المؤسسي",
    "رفع الكفاءة المهنية",
    "فرق ولجان العمل",
    "الشراكة المجتمعية",
    "التواصل مع أولياء الأمور",
    "مبادرات تنظيمية وإدارية",
    "اجتماعات ولقاءات مهنية",
    "تطوير البيئة المدرسية",
    "الابتكار والتطوير",
    "التقييم الذاتي ومتابعة خطط التحسين",
    "الأمن والسلامة وإدارة المخاطر",
    "المتابعة وقياس الأثر",
    "أخرى"
  ]
};
/* =========================================================
   سياق التنفيذ
   ========================================================= */
const EXECUTION_CONTEXT_LABELS = {
  classroom: "داخل الصف",
  before_assembly: "قبل الطابور",
  morning_assembly: "الطابور الصباحي",
  break: "الفسحة",
  learning_resources_center: "مركز مصادر التعلم",
  outside_school: "خارج المدرسة",
  other: "أخرى"
};
/* =========================================================
   مشاركة أولياء الأمور
   ========================================================= */
const PARENT_PARTICIPATION_LABELS = {
  none: "لا توجد مشاركة",
  attendance: "حضور أولياء الأمور",
  implementation: "مشاركة في التنفيذ",
  partnership_support: "شراكة / دعم"
};
/* =========================================================
   أدوات عامة
   ========================================================= */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function valueOf(id) {
  return (
    byId(id)?.value || ""
  ).trim();
}
function numberOrNull(value) {
  const raw =
    String(value ?? "").trim();
  if (raw === "") {
    return null;
  }
  const number =
    Number(raw);
  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }
  return Math.floor(number);
}
function formatDate(value) {
  if (!value) {
    return "";
  }
  try {
    return new Date(
      value + "T00:00:00"
    ).toLocaleDateString("ar-BH");
  } catch {
    return value;
  }
}
function showMessage(message) {
  if (
    typeof window.wrToast ===
    "function"
  ) {
    window.wrToast(message);
    return;
  }
  alert(message);
}
/* =========================================================
   Supabase
   ========================================================= */
function getSupabase() {
  if (window.wrSupabase) {
    return window.wrSupabase;
  }
  if (
    !window.supabase ||
    !window.WR_CONFIG
  ) {
    throw new Error(
      "Supabase غير متاح."
    );
  }
  return window.supabase.createClient(
    window.WR_CONFIG.supabaseUrl,
    window.WR_CONFIG.supabaseKey
  );
}
/* =========================================================
   المستخدم الحالي
   ========================================================= */
async function loadCurrentUser() {
  try {
    if (
      window.WRGraph &&
      typeof WRGraph.init === "function"
    ) {
      await WRGraph.init();
    }
    const sb =
      getSupabase();
    const {
      data,
      error
    } = await sb.auth.getUser();
    if (error) {
      throw error;
    }
    currentUser =
      data?.user || null;
    if (!currentUser) {
      location.href =
        "../../index.html";
      return null;
    }
    if (
      window.WRGraph &&
      typeof WRGraph.getUserProfile ===
        "function"
    ) {
      try {
        currentProfile =
          await WRGraph.getUserProfile();
      } catch (error) {
        console.warn(
          "WRGraph profile:",
          error
        );
      }
    }
    if (!currentProfile) {
      const {
        data: profile,
        error: profileError
      } = await sb
        .from("user_profiles")
        .select(
          "user_id, full_name, role, department_id, is_active"
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();
      if (profileError) {
        throw profileError;
      }
      currentProfile =
        profile || null;
    }
    loadedRecordOwnerId =
      currentUser.id;
    if (byId("executor")) {
      byId("executor").value =
        currentProfile?.full_name ||
        currentUser.email ||
        "";
    }
    return currentProfile;
  } catch (error) {
    console.error(
      "loadCurrentUser:",
      error
    );
    showMessage(
      "تعذر تحميل بيانات الحساب."
    );
    return null;
  }
}
/* =========================================================
   السنة الدراسية
   ========================================================= */
async function loadSchoolYear() {
  try {
    if (
      window.WRGraph &&
      typeof WRGraph.getSettings ===
        "function"
    ) {
      const settings =
        await WRGraph.getSettings();
      currentSchoolYear =
        settings?.school_year ||
        settings?.schoolYear ||
        settings?.active_school_year ||
        "";
    }
  } catch (error) {
    console.warn(
      "School year:",
      error
    );
  }
  if (!currentSchoolYear) {
    const now =
      new Date();
    const year =
      now.getFullYear();
    const month =
      now.getMonth() + 1;
    currentSchoolYear =
      month >= 8
        ? `${year}/${year + 1}`
        : `${year - 1}/${year}`;
  }
}
/* =========================================================
   الأقسام
   ========================================================= */
async function loadDepartments() {
  const select =
    byId("department");
  if (!select) {
    return;
  }
  try {
    const sb =
      getSupabase();
    const {
      data,
      error
    } = await sb
      .from("departments")
      .select("id, name")
      .order("name");
    if (error) {
      throw error;
    }
    departments =
      (data || []).filter(
        row =>
          row.id &&
          row.name
      );
    select.innerHTML =
      departments.map(
        department => `
          <option
            value="${esc(department.id)}"
          >
            ${esc(department.name)}
          </option>
        `
      ).join("");
  } catch (error) {
    console.error(
      "loadDepartments:",
      error
    );
    select.innerHTML = "";
  }
}
function getSelectedDepartments() {
  const select =
    byId("department");
  if (!select) {
    return [];
  }
  return [
    ...select.selectedOptions
  ].map(
    option => ({
      id:
        String(
          option.value
        ),
      name:
        option.textContent.trim()
    })
  );
}
function setSelectedDepartments(
  payload = {}
) {
  const select =
    byId("department");
  if (!select) {
    return;
  }
  let ids = [];
  if (
    Array.isArray(
      payload.departmentIds
    )
  ) {
    ids =
      payload.departmentIds
        .map(String);
  }
  if (
    !ids.length &&
    Array.isArray(
      payload.departments
    )
  ) {
    const names =
      payload.departments
        .map(
          item =>
            String(item).trim()
        );
    ids =
      departments
        .filter(
          department =>
            names.includes(
              department.name
            )
        )
        .map(
          department =>
            String(
              department.id
            )
        );
  }
  if (
    !ids.length &&
    payload.department
  ) {
    const names =
      String(
        payload.department
      )
        .split(/[،,]/)
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);
    ids =
      departments
        .filter(
          department =>
            names.includes(
              department.name
            )
        )
        .map(
          department =>
            String(
              department.id
            )
        );
  }
  [
    ...select.options
  ].forEach(
    option => {
      option.selected =
        ids.includes(
          String(
            option.value
          )
        );
    }
  );
}
/* =========================================================
   تحميل الحسابات الرسمية للمشاركة
   ========================================================= */
async function fetchActivityUsersViaRpc() {
  const sb =
    getSupabase();
  const {
    data,
    error
  } = await sb.rpc(
    "list_activity_participants"
  );
  if (error) {
    throw error;
  }
  return data || [];
}
function normalizeActivityUser(
  row
) {
  if (!row) {
    return null;
  }
  const userId =
    row.user_id ||
    row.id ||
    row.uid ||
    null;
  const fullName =
    row.full_name ||
    row.name ||
    row.display_name ||
    "";
  const role =
    row.role ||
    row.user_role ||
    "";
  if (
    !userId ||
    !String(fullName).trim()
  ) {
    return null;
  }
  return {
    user_id:
      String(userId),
    full_name:
      String(
        fullName
      ).trim(),
    role:
      String(
        role || ""
      ).trim()
  };
}
async function loadActivityUsers() {
  try {
    const rows =
      await fetchActivityUsersViaRpc();
    const currentUserId =
      String(
        currentUser?.id || ""
      );
    const unique =
      new Map();
    rows
      .map(
        normalizeActivityUser
      )
      .filter(Boolean)
      .forEach(
        user => {
          if (
            user.user_id ===
            currentUserId
          ) {
            return;
          }
          unique.set(
            user.user_id,
            user
          );
        }
      );
    activityUsers =
      [
        ...unique.values()
      ]
        .sort(
          (a, b) =>
            a.full_name.localeCompare(
              b.full_name,
              "ar"
            )
        );
    selectedCoExecutorIds =
      selectedCoExecutorIds.filter(
        id =>
          activityUsers.some(
            user =>
              user.user_id ===
              String(id)
          )
      );
    renderCoExecutors();
  } catch (error) {
    console.error(
      "loadActivityUsers:",
      error
    );
    activityUsers = [];
    selectedCoExecutorIds = [];
    renderCoExecutors();
    showMessage(
      "تعذر تحميل قائمة المشاركات في التنفيذ."
    );
  }
}
/* =========================================================
   المشاركات في التنفيذ
   ========================================================= */
function renderCoExecutors() {
  const list =
    byId(
      "coExecutorsList"
    );
  if (!list) {
    return;
  }
  list.innerHTML = "";
  if (
    !activityUsers.length
  ) {
    list.innerHTML =
      `
        <div class="co-empty">
          لا توجد حسابات متاحة.
        </div>
      `;
    return;
  }
  activityUsers.forEach(
    user => {
      const label =
        document.createElement(
          "label"
        );
      label.className =
        "co-user";
      const checkbox =
        document.createElement(
          "input"
        );
      checkbox.type =
        "checkbox";
      checkbox.value =
        user.user_id;
      checkbox.checked =
        selectedCoExecutorIds.includes(
          user.user_id
        );
      checkbox.addEventListener(
        "change",
        () => {
          if (
            checkbox.checked
          ) {
            if (
              !selectedCoExecutorIds.includes(
                user.user_id
              )
            ) {
              selectedCoExecutorIds.push(
                user.user_id
              );
            }
          } else {
            selectedCoExecutorIds =
              selectedCoExecutorIds.filter(
                id =>
                  id !==
                  user.user_id
              );
          }
          updatePreview();
          scheduleDraft();
        }
      );
      const text =
        document.createElement(
          "span"
        );
      text.textContent =
        user.full_name;
      label.appendChild(
        checkbox
      );
      label.appendChild(
        text
      );
      list.appendChild(
        label
      );
    }
  );
}
function getSelectedCoExecutorNames() {
  const selectedSet =
    new Set(
      selectedCoExecutorIds.map(
        String
      )
    );
  return activityUsers
    .filter(
      user =>
        selectedSet.has(
          user.user_id
        )
    )
    .map(
      user =>
        user.full_name
    );
}
/* =========================================================
   تحديث قائمة المشاريع حسب المجال
   ========================================================= */
function refreshSchoolProjects(
  selectedValue = ""
) {
  const domain =
    valueOf(
      "documentationDomain"
    );
  const select =
    byId("schoolProject");
  if (!select) {
    return;
  }
  const projects =
    SCHOOL_PROJECT_MAP[
      domain
    ] || [];
  if (!domain) {
    select.innerHTML =
      `<option value="">
        — اختاري المجال أولًا —
      </option>`;
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.innerHTML =
    `
      <option value="">
        — اختاري المشروع —
      </option>
    ` +
    projects
      .map(
        project => `
          <option
            value="${esc(project)}"
          >
            ${esc(project)}
          </option>
        `
      )
      .join("");
  if (selectedValue) {
    const exists =
      [
        ...select.options
      ].some(
        option =>
          option.value ===
          selectedValue
      );
    if (!exists) {
      const option =
        document.createElement(
          "option"
        );
      option.value =
        selectedValue;
      option.textContent =
        selectedValue;
      select.appendChild(
        option
      );
    }
    select.value =
      selectedValue;
  }
}
/* =========================================================
   تحديث أنواع التوثيق
   ========================================================= */
function refreshActivityCategories(
  selectedValue = ""
) {
  const domain =
    valueOf(
      "documentationDomain"
    );
  const select =
    byId("activityCategory");
  if (!select) {
    return;
  }
  const categories =
    ACTIVITY_CATEGORY_MAP[
      domain
    ] || [];
  if (!domain) {
    select.innerHTML =
      `<option value="">
        — اختاري المجال أولًا —
      </option>`;
    select.disabled = true;
    updateOtherCategoryVisibility();
    return;
  }
  select.disabled = false;
  select.innerHTML =
    `
      <option value="">
        — اختاري نوع التوثيق —
      </option>
    ` +
    categories
      .map(
        category => `
          <option
            value="${esc(category)}"
          >
            ${esc(category)}
          </option>
        `
      )
      .join("");
  if (selectedValue) {
    const exists =
      categories.includes(
        selectedValue
      );
    if (exists) {
      select.value =
        selectedValue;
    } else {
      select.value =
        "أخرى";
      if (
        byId(
          "otherActivityCategory"
        )
      ) {
        byId(
          "otherActivityCategory"
        ).value =
          selectedValue;
      }
    }
  }
  updateOtherCategoryVisibility();
}
/* =========================================================
   خانة "أخرى"
   ========================================================= */
function updateOtherCategoryVisibility() {
  const select =
    byId("activityCategory");
  const wrap =
    byId("otherCategoryWrap");
  const input =
    byId(
      "otherActivityCategory"
    );
  if (
    !select ||
    !wrap ||
    !input
  ) {
    return;
  }
  const isOther =
    select.value ===
    "أخرى";
  wrap.style.display =
    isOther
      ? ""
      : "none";
  input.required =
    isOther;
  if (!isOther) {
    input.value = "";
  }
}
/* =========================================================
   نوع التوثيق النهائي
   ========================================================= */
function getResolvedActivityCategory() {
  const selected =
    valueOf(
      "activityCategory"
    );
  if (
    selected === "أخرى"
  ) {
    return valueOf(
      "otherActivityCategory"
    );
  }
  return selected;
}
/* =========================================================
   اللجنة الطلابية
   ========================================================= */
function updateCommitteeVisibility() {
  const wrap =
    byId(
      "studentCommitteeWrap"
    );
  const input =
    byId(
      "studentCommitteeName"
    );
  if (
    !wrap ||
    !input
  ) {
    return;
  }
  const domain =
    valueOf(
      "documentationDomain"
    );
  const category =
    getResolvedActivityCategory();
  const show =
    domain ===
      "personal_development" &&
    (
      category ===
        "اللجان الطلابية" ||
      category.includes(
        "لجنة"
      )
    );
  wrap.style.display =
    show
      ? ""
      : "none";
  input.required =
    show;
  if (!show) {
    input.value = "";
  }
}
/* =========================================================
   الفئات المستهدفة
   ========================================================= */
function getSelectedTargets() {
  return [
    ...document.querySelectorAll(
      ".wr-target-check:checked"
    )
  ].map(
    checkbox =>
      checkbox.value
  );
}
function setSelectedTargets(
  targets
) {
  let values = [];
  if (
    Array.isArray(targets)
  ) {
    values =
      targets.map(String);
  } else if (targets) {
    values =
      String(targets)
        .split(/[،,]/)
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);
  }
  document
    .querySelectorAll(
      ".wr-target-check"
    )
    .forEach(
      checkbox => {
        checkbox.checked =
          values.includes(
            checkbox.value
          );
      }
    );
}
/* =========================================================
   تجميع بيانات النموذج
   ========================================================= */
function collectFormData() {
  const selectedDepartments =
    getSelectedDepartments();
  const beneficiaryCount =
    numberOrNull(
      valueOf(
        "beneficiaryCount"
      )
    );
  const benefitTimes =
    numberOrNull(
      valueOf(
        "benefitTimes"
      )
    );
  const categorySelection =
    valueOf(
      "activityCategory"
    );
  const otherCategory =
    valueOf(
      "otherActivityCategory"
    );
  const resolvedCategory =
    getResolvedActivityCategory();
  return {
    name:
      valueOf("name"),
    title:
      valueOf("name"),
    documentationDomain:
      valueOf(
        "documentationDomain"
      ),
    documentation_domain:
      valueOf(
        "documentationDomain"
      ),
    schoolProject:
      valueOf(
        "schoolProject"
      ),
    school_project:
      valueOf(
        "schoolProject"
      ),
    activityCategory:
      resolvedCategory,
    activity_category:
      resolvedCategory,
    activityCategorySelection:
      categorySelection,
    otherActivityCategory:
      categorySelection ===
        "أخرى"
          ? otherCategory
          : "",
    date:
      valueOf("date"),
    record_date:
      valueOf("date"),
    executionContext:
      valueOf(
        "executionContext"
      ),
    execution_context:
      valueOf(
        "executionContext"
      ),
    place:
      valueOf("place"),
    executor:
      valueOf("executor"),
    departmentIds:
      selectedDepartments.map(
        item => item.id
      ),
    departments:
      selectedDepartments.map(
        item => item.name
      ),
    department:
      selectedDepartments
        .map(
          item => item.name
        )
        .join("، "),
    coExecutorIds:
      [
        ...selectedCoExecutorIds
      ],
    coExecutors:
      getSelectedCoExecutorNames(),
    parentParticipation:
      valueOf(
        "parentParticipation"
      ) || "none",
    parent_participation:
      valueOf(
        "parentParticipation"
      ) || "none",
    beneficiaryCount:
      beneficiaryCount,
    beneficiary_count:
      beneficiaryCount,
    benefitTimes:
      benefitTimes,
    benefit_times:
      benefitTimes,
    /*
      count القديم = إجمالي مرات الاستفادة
    */
    count:
      benefitTimes === null
        ? ""
        : String(
            benefitTimes
          ),
    target:
      getSelectedTargets(),
    targets:
      getSelectedTargets(),
    activityApproved:
      valueOf(
        "activityApproved"
      ),
    studentCommitteeName:
      valueOf(
        "studentCommitteeName"
      ),
    student_committee_name:
      valueOf(
        "studentCommitteeName"
      ),
    goal:
      valueOf("goal"),
    implementation:
      valueOf(
        "implementation"
      ),
    results:
      valueOf("results"),
    recommendations:
      valueOf(
        "recommendations"
      ),
    notes:
      valueOf("notes"),
    schoolYear:
      currentSchoolYear,
    school_year:
      currentSchoolYear,
    activityType:
      valueOf(
        "activityType"
      ) || "فعالية",
    startTime:
      valueOf(
        "startTime"
      ),
    endTime:
      valueOf(
        "endTime"
      )
  };
}
/* =========================================================
   التحقق قبل الحفظ
   ========================================================= */
function validateForm() {
  const data = collectFormData();
  if (!data.name) {
    showMessage("اكتبي اسم الفعالية.");
    byId("name")?.focus();
    return false;
  }
  /*
    السجل الجديد يجب أن يكون مصنفًا بالكامل.
    السجلات القديمة يمكن تعديلها كما هي حتى لو كانت
    بعض حقول التصنيف الحديثة غير موجودة فيها.
  */
  if (!currentId) {
    if (!data.documentationDomain) {
      showMessage("اختاري المجال الرئيسي.");
      byId("documentationDomain")?.focus();
      return false;
    }
    if (!data.schoolProject) {
      showMessage("اختاري المشروع المدرسي.");
      byId("schoolProject")?.focus();
      return false;
    }
    if (!valueOf("activityCategory")) {
      showMessage("اختاري نوع التوثيق.");
      byId("activityCategory")?.focus();
      return false;
    }
    if (
      valueOf("activityCategory") === "أخرى" &&
      !valueOf("otherActivityCategory")
    ) {
      showMessage("اكتبي نوع التوثيق في خانة «أخرى».");
      byId("otherActivityCategory")?.focus();
      return false;
    }
    if (!data.executionContext) {
      showMessage("اختاري سياق التنفيذ.");
      byId("executionContext")?.focus();
      return false;
    }
  }
  if (!data.date) {
    showMessage("اختاري تاريخ التنفيذ.");
    byId("date")?.focus();
    return false;
  }
  if (!data.executor) {
    showMessage("تعذر تحديد المنفذة الرئيسية.");
    return false;
  }
  if (!data.departmentIds.length) {
    showMessage("اختاري القسم أو الأقسام.");
    byId("department")?.focus();
    return false;
  }
  if (
    data.documentationDomain === "personal_development" &&
    data.activityCategory === "اللجان الطلابية" &&
    !data.studentCommitteeName
  ) {
    showMessage("اكتبي اسم اللجنة الطلابية.");
    byId("studentCommitteeName")?.focus();
    return false;
  }
  const beneficiaryRaw = valueOf("beneficiaryCount");
  if (
    beneficiaryRaw &&
    (
      Number(beneficiaryRaw) < 0 ||
      !Number.isFinite(Number(beneficiaryRaw))
    )
  ) {
    showMessage("راجعي عدد المستفيدين.");
    return false;
  }
  const benefitRaw = valueOf("benefitTimes");
  if (
    benefitRaw &&
    (
      Number(benefitRaw) < 0 ||
      !Number.isFinite(Number(benefitRaw))
    )
  ) {
    showMessage("راجعي إجمالي مرات الاستفادة.");
    return false;
  }
  return true;
}
/* =========================================================
   أدوات معاينة التقرير
   ========================================================= */
function setText(
  id,
  value
) {
  const element =
    byId(id);
  if (!element) {
    return;
  }
  element.textContent =
    value ?? "";
}
function setFieldVisibility(
  field,
  visible
) {
  document
    .querySelectorAll(
      `[data-field="${field}"]`
    )
    .forEach(
      element => {
        element.style.display =
          visible
            ? ""
            : "none";
      }
    );
}
function setSectionVisibility(
  section,
  visible
) {
  document
    .querySelectorAll(
      `[data-section="${section}"]`
    )
    .forEach(
      element => {
        element.style.display =
          visible
            ? ""
            : "none";
      }
    );
}
/* =========================================================
   تحديث معاينة التقرير
   ========================================================= */
function updatePreview() {
  const data =
    collectFormData();
  setText(
    "pName",
    data.name ||
      "تقرير فعالية"
  );
  const domainLabel =
    ACTIVITY_DOMAIN_LABELS[
      data.documentationDomain
    ] || "";
  setText(
    "pDocumentationDomain",
    domainLabel ||
      "غير مصنف"
  );
  setText(
    "pSchoolProject",
    data.schoolProject
  );
  setFieldVisibility(
    "schoolProject",
    Boolean(
      data.schoolProject
    )
  );
  setText(
    "pActivityCategory",
    data.activityCategory
  );
  setFieldVisibility(
    "activityCategory",
    Boolean(
      data.activityCategory
    )
  );
  setText(
    "pDate",
    formatDate(
      data.date
    )
  );
  setFieldVisibility(
    "date",
    Boolean(
      data.date
    )
  );
  setText(
    "pExecutor",
    data.executor
  );
  setText(
    "pExecutorFooter",
    data.executor ||
      "ـــــــــــــــــــــــــ"
  );
  setFieldVisibility(
    "executor",
    Boolean(
      data.executor
    )
  );
  const coExecutors =
    data.coExecutors.join(
      "، "
    );
  setText(
    "pCoExecutors",
    coExecutors
  );
  setFieldVisibility(
    "coExecutors",
    Boolean(
      coExecutors
    )
  );
  const departmentText =
    data.departments.join(
      "، "
    );
  setText(
    "pDepartment",
    departmentText
  );
  setFieldVisibility(
    "department",
    Boolean(
      departmentText
    )
  );
  const executionLabel =
    EXECUTION_CONTEXT_LABELS[
      data.executionContext
    ] || "";
  setText(
    "pExecutionContext",
    executionLabel
  );
  setFieldVisibility(
    "executionContext",
    Boolean(
      executionLabel
    )
  );
  setText(
    "pPlace",
    data.place
  );
  setFieldVisibility(
    "place",
    Boolean(
      data.place
    )
  );
  const parentLabel =
    PARENT_PARTICIPATION_LABELS[
      data.parentParticipation
    ] || "";
  setText(
    "pParentParticipation",
    parentLabel
  );
  setFieldVisibility(
    "parentParticipation",
    Boolean(
      parentLabel
    )
  );
  const targets =
    data.targets.join(
      "، "
    );
  setText(
    "pTarget",
    targets
  );
  setFieldVisibility(
    "target",
    Boolean(
      targets
    )
  );
  setText(
    "pBeneficiaryCount",
    data.beneficiaryCount === null
      ? ""
      : String(
          data.beneficiaryCount
        )
  );
  setFieldVisibility(
    "beneficiaryCount",
    data.beneficiaryCount !==
      null
  );
  setText(
    "pBenefitTimes",
    data.benefitTimes === null
      ? ""
      : String(
          data.benefitTimes
        )
  );
  setText(
    "pCount",
    data.benefitTimes === null
      ? ""
      : String(
          data.benefitTimes
        )
  );
  setFieldVisibility(
    "benefitTimes",
    data.benefitTimes !==
      null
  );
  let approvalLabel = "";
  if (
    data.activityApproved ===
      "yes"
  ) {
    approvalLabel =
      "معتمدة";
  } else if (
    data.activityApproved ===
      "no"
  ) {
    approvalLabel =
      "غير معتمدة";
  }
  setText(
    "pApproval",
    approvalLabel
  );
  setFieldVisibility(
    "approval",
    Boolean(
      approvalLabel
    )
  );
  const committeeWrap =
    byId(
      "pStudentCommitteeWrap"
    );
  setText(
    "pStudentCommitteeName",
    data.studentCommitteeName
  );
  if (committeeWrap) {
    committeeWrap.style.display =
      data.studentCommitteeName
        ? ""
        : "none";
  }
  setText(
    "pGoal",
    data.goal
  );
  setSectionVisibility(
    "goal",
    Boolean(
      data.goal
    )
  );
  setText(
    "pImplementation",
    data.implementation
  );
  setSectionVisibility(
    "implementation",
    Boolean(
      data.implementation
    )
  );
  setText(
    "pResults",
    data.results
  );
  setSectionVisibility(
    "results",
    Boolean(
      data.results
    )
  );
  setText(
    "pRecommendations",
    data.recommendations
  );
  setSectionVisibility(
    "recommendations",
    Boolean(
      data.recommendations
    )
  );
  setText(
    "pNotes",
    data.notes
  );
  setSectionVisibility(
    "notes",
    Boolean(
      data.notes
    )
  );
}
/* =========================================================
   المسودة المحلية
   ========================================================= */
let draftTimer = null;
function scheduleDraft() {
  clearTimeout(
    draftTimer
  );
  draftTimer =
    setTimeout(
      saveDraft,
      450
    );
}
function saveDraft() {
  if (currentId) {
    return;
  }
  try {
    const data =
      collectFormData();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(data)
    );
    if (
      byId("draftState")
    ) {
      byId(
        "draftState"
      ).textContent =
        "تم حفظ المسودة تلقائيًا على هذا الجهاز.";
    }
  } catch (error) {
    console.warn(
      "Draft save:",
      error
    );
  }
}
function clearDraft() {
  try {
    localStorage.removeItem(
      DRAFT_KEY
    );
  } catch {}
}
function restoreDraft() {
  if (currentId) {
    return;
  }
  try {
    const raw =
      localStorage.getItem(
        DRAFT_KEY
      );
    if (!raw) {
      return;
    }
    const data =
      JSON.parse(raw);
    applyPayloadToForm(
      data,
      {
        fromDraft: true
      }
    );
    if (
      byId("draftState")
    ) {
      byId(
        "draftState"
      ).textContent =
        "تم استرجاع المسودة المحفوظة على هذا الجهاز.";
    }
  } catch (error) {
    console.warn(
      "Draft restore:",
      error
    );
  }
}
/* =========================================================
   تطبيق البيانات على النموذج
   ========================================================= */
function applyPayloadToForm(
  payload = {},
  options = {}
) {
  const setValue =
    (
      id,
      value
    ) => {
      const element =
        byId(id);
      if (!element) {
        return;
      }
      element.value =
        value ?? "";
    };
  setValue(
    "name",
    payload.name ||
    payload.title ||
    ""
  );
  const domain =
    payload.documentationDomain ||
    payload.documentation_domain ||
    "";
  setValue(
    "documentationDomain",
    domain
  );
  const project =
    payload.schoolProject ||
    payload.school_project ||
    "";
  refreshSchoolProjects(
    project
  );
  const storedCategory =
    payload.activityCategory ||
    payload.activity_category ||
    payload.otherActivityCategory ||
    "";
  refreshActivityCategories(
    storedCategory
  );
  if (
    payload.activityCategorySelection ===
      "أخرى"
  ) {
    setValue(
      "activityCategory",
      "أخرى"
    );
    setValue(
      "otherActivityCategory",
      payload.otherActivityCategory ||
      storedCategory
    );
  }
  updateOtherCategoryVisibility();
  setValue(
    "date",
    String(
      payload.date ||
      payload.record_date ||
      ""
    ).slice(0, 10)
  );
  setValue(
    "executor",
    loadedRecordOwnerName ||
    payload.executor ||
    ""
  );
  setValue(
    "executionContext",
    payload.executionContext ||
    payload.execution_context ||
    ""
  );
  setValue(
    "place",
    payload.place ||
    ""
  );
  setValue(
    "parentParticipation",
    payload.parentParticipation ||
    payload.parent_participation ||
    "none"
  );
  const beneficiary =
    payload.beneficiaryCount ??
    payload.beneficiary_count ??
    "";
  setValue(
    "beneficiaryCount",
    beneficiary
  );
  const benefitTimes =
    payload.benefitTimes ??
    payload.benefit_times ??
    payload.count ??
    "";
  setValue(
    "benefitTimes",
    benefitTimes
  );
  setValue(
    "activityApproved",
    payload.activityApproved ||
    ""
  );
  setValue(
    "studentCommitteeName",
    payload.studentCommitteeName ||
    payload.student_committee_name ||
    ""
  );
  setValue(
    "goal",
    payload.goal ||
    ""
  );
  setValue(
    "implementation",
    payload.implementation ||
    ""
  );
  setValue(
    "results",
    payload.results ||
    ""
  );
  setValue(
    "recommendations",
    payload.recommendations ||
    ""
  );
  setValue(
    "notes",
    payload.notes ||
    ""
  );
  setSelectedDepartments(
    payload
  );
  setSelectedTargets(
    payload.targets ||
    payload.target ||
    []
  );
  if (
    options.fromDraft &&
    Array.isArray(
      payload.coExecutorIds
    )
  ) {
    selectedCoExecutorIds =
      payload.coExecutorIds.map(
        String
      );
    renderCoExecutors();
  }
  updateCommitteeVisibility();
  updatePreview();
}
/* =========================================================
   تطبيق سجل Supabase
   ========================================================= */

function applyFormData(
  record
) {

  const payload =
    record?.payload || {};

  const merged = {

    ...payload,

    title:
      record?.title ||
      payload.title ||
      payload.name ||
      "",

    name:
      payload.name ||
      record?.title ||
      "",

    /*
      تاريخ الجدول له الأولوية.
      ده يمنع ضياع تاريخ السجل القديم.
    */
    date:
      String(
        record?.record_date ||
        payload.date ||
        payload.record_date ||
        ""
      ).slice(0, 10),

    record_date:
      String(
        record?.record_date ||
        payload.record_date ||
        payload.date ||
        ""
      ).slice(0, 10),

    documentationDomain:
      record?.documentation_domain ||
      payload.documentationDomain ||
      payload.documentation_domain ||
      "",

    documentation_domain:
      record?.documentation_domain ||
      payload.documentation_domain ||
      "",

    schoolProject:
      record?.school_project ||
      payload.schoolProject ||
      payload.school_project ||
      "",

    school_project:
      record?.school_project ||
      payload.school_project ||
      "",

    activityCategory:
      record?.activity_category ||
      payload.activityCategory ||
      payload.activity_category ||
      "",

    activity_category:
      record?.activity_category ||
      payload.activity_category ||
      "",

    executionContext:
      record?.execution_context ||
      payload.executionContext ||
      payload.execution_context ||
      "",

    parentParticipation:
      record?.parent_participation ||
      payload.parentParticipation ||
      payload.parent_participation ||
      "none",

    studentCommitteeName:
      record?.student_committee_name ||
      payload.studentCommitteeName ||
      payload.student_committee_name ||
      "",

    beneficiaryCount:
      record?.beneficiary_count ??
      payload.beneficiaryCount ??
      payload.beneficiary_count ??
      "",

    benefitTimes:
      record?.benefit_times ??
      payload.benefitTimes ??
      payload.benefit_times ??
      payload.count ??
      "",

    /*
      اسم صاحبة السجل الأصلية.
      لا نضع اسم المنسقة التي فتحت السجل.
    */
    executor:
      loadedRecordOwnerName ||
      payload.executor ||
      ""

  };

  remoteImagePaths =
    Array.isArray(
      record?.image_paths
    )
      ? [
          ...record.image_paths
        ]
      : (
          Array.isArray(
            payload.image_paths
          )
            ? [
                ...payload.image_paths
              ]
            : []
        );

  applyPayloadToForm(
    merged
  );

  renderCoExecutors();

  updatePreview();

  renderImages();
}


/* =========================================================
   قراءة ID من الرابط
   ========================================================= */

function getRecordIdFromUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("id") || ""
  ).trim();
}


/* =========================================================
   تحميل المشاركين المحفوظين
   ========================================================= */

async function loadParticipants() {

  if (!currentId) {
    return;
  }

  try {

    const sb =
      getSupabase();

    const {
      data,
      error
    } = await sb
      .from("activity_participants")
      .select(
        "user_id, participation_role"
      )
      .eq(
        "activity_id",
        currentId
      );

    if (error) {
      throw error;
    }

    const rows =
      data || [];

    const main =
      rows.find(
        row =>
          row.participation_role ===
          "main_executor"
      );

    /*
      created_by في records هو المرجع الأساسي
      لصاحبة السجل.

      نستخدم main_executor فقط كسند للسجلات
      القديمة جدًا التي لا تحتوي created_by.
    */
    if (
      !loadedRecordOwnerId &&
      main?.user_id
    ) {

      loadedRecordOwnerId =
        main.user_id;
    }

    selectedCoExecutorIds =
      rows
        .filter(
          row =>
            row.participation_role ===
            "co_executor"
        )
        .map(
          row =>
            String(
              row.user_id
            )
        );

  } catch (error) {

    console.warn(
      "loadParticipants:",
      error
    );
  }
}


/* =========================================================
   تحميل اسم صاحبة السجل الأصلية
   ========================================================= */

async function loadRecordOwnerName() {

  loadedRecordOwnerName = "";

  if (!loadedRecordOwnerId) {
    return "";
  }

  try {

    const sb =
      getSupabase();

    const {
      data,
      error
    } = await sb
      .from("user_profiles")
      .select("full_name")
      .eq(
        "user_id",
        loadedRecordOwnerId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    loadedRecordOwnerName =
      String(
        data?.full_name ||
        ""
      ).trim();

    return loadedRecordOwnerName;

  } catch (error) {

    console.warn(
      "loadRecordOwnerName:",
      error
    );

    return "";
  }
}


/* =========================================================
   تحميل سجل موجود
   ========================================================= */

async function loadExistingRecord() {

  if (!currentId) {
    return;
  }

  try {

    const sb =
      getSupabase();

    const {
      data,
      error
    } = await sb
      .from("records")
      .select(`
        id,
        type,
        title,
        record_date,
        payload,
        image_paths,
        created_by,
        created_at,
        updated_at,
        documentation_domain,
        school_project,
        activity_category,
        execution_context,
        parent_participation,
        student_committee_name,
        beneficiary_count,
        benefit_times
      `)
      .eq(
        "id",
        currentId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {

      showMessage(
        "لم يتم العثور على التوثيق."
      );

      return;
    }

    /*
      مهم جدًا:
      لا نستخدم المستخدم الحالي كصاحبة للسجل
      عند فتح سجل معلمة بواسطة المنسقة.
    */
    loadedRecordOwnerId =
      data.created_by ||
      null;

    await loadRecordOwnerName();

    if (
      byId("pageTitle")
    ) {

      byId(
        "pageTitle"
      ).textContent =
        "تعديل التوثيق";
    }

    await loadParticipants();

    /*
      لو السجل قديم ولا يوجد created_by
      نستفيد من main_executor.
    */
    if (
      !loadedRecordOwnerName &&
      loadedRecordOwnerId
    ) {

      await loadRecordOwnerName();
    }

    applyFormData(data);

    /*
      نثبت المنفذة الأصلية مرة أخرى
      بعد تطبيق جميع بيانات النموذج.
    */
    if (
      byId("executor") &&
      loadedRecordOwnerName
    ) {

      byId("executor").value =
        loadedRecordOwnerName;
    }

    /*
      تثبيت التاريخ الأصلي.
    */
    const originalDate =
      String(
        data.record_date ||
        data?.payload?.date ||
        data?.payload?.record_date ||
        ""
      )
        .trim()
        .slice(0, 10);

    if (
      originalDate &&
      byId("date")
    ) {

      byId("date").value =
        originalDate;
    }

    updateCommitteeVisibility();

    updatePreview();

    await renderImages();

    updateDeleteButton();

  } catch (error) {

    console.error(
      "loadExistingRecord:",
      error
    );

    showMessage(
      "تعذر تحميل التوثيق."
    );
  }
}


/* =========================================================
   حفظ المشاركين
   ========================================================= */

async function saveParticipants(
  activityId,
  mainExecutorId
) {

  const sb =
    getSupabase();

  const {
    error: deleteError
  } = await sb
    .from(
      "activity_participants"
    )
    .delete()
    .eq(
      "activity_id",
      activityId
    );

  if (deleteError) {
    throw deleteError;
  }

  const rows = [];

  if (mainExecutorId) {

    rows.push({

      activity_id:
        activityId,

      user_id:
        mainExecutorId,

      participation_role:
        "main_executor",

      created_by:
        currentUser.id
    });
  }

  const uniqueCoExecutors =
    [
      ...new Set(
        selectedCoExecutorIds
          .map(String)
      )
    ]
      .filter(
        userId =>
          userId !==
          String(
            mainExecutorId
          )
      );

  uniqueCoExecutors.forEach(
    userId => {

      rows.push({

        activity_id:
          activityId,

        user_id:
          userId,

        participation_role:
          "co_executor",

        created_by:
          currentUser.id
      });
    }
  );

  if (!rows.length) {
    return;
  }

  const {
    error
  } = await sb
    .from(
      "activity_participants"
    )
    .insert(rows);

  if (error) {
    throw error;
  }
}


/* =========================================================
   إنشاء ID
   ========================================================= */

function createActivityId() {

  if (
    window.crypto &&
    typeof crypto.randomUUID ===
      "function"
  ) {

    return (
      "activity-" +
      crypto.randomUUID()
    );
  }

  return (
    "activity-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 10)
  );
}


/* =========================================================
   رفع الصور
   ========================================================= */

async function uploadNewImages(
  activityId
) {
  if (remoteImagePaths.length + selectedFiles.length > 3) {
    throw new Error("الحد الأقصى 3 صور لكل تقرير.");
  }

  if (!selectedFiles.length) {

    return [
      ...remoteImagePaths
    ];
  }

  if (
    !window.WRGraph ||
    typeof WRGraph.uploadFiles !==
      "function"
  ) {

    throw new Error(
      "خدمة رفع الصور غير متاحة."
    );
  }

  const uploaded =
    await WRGraph.uploadFiles(
      activityId,
      selectedFiles
    );

  let newPaths = [];

  if (
    Array.isArray(uploaded)
  ) {

    newPaths =
      uploaded
        .map(
          item => {

            if (
              typeof item ===
              "string"
            ) {
              return item;
            }

            return (
              item?.path ||
              item?.file_path ||
              item?.storage_path ||
              ""
            );
          }
        )
        .filter(Boolean);

  } else if (
    uploaded &&
    Array.isArray(
      uploaded.paths
    )
  ) {

    newPaths =
      uploaded.paths.filter(
        Boolean
      );
  }

  return [
    ...new Set([
      ...remoteImagePaths,
      ...newPaths
    ])
  ];
}


/* =========================================================
   تحديث أعمدة التصنيف
   ========================================================= */

async function updateClassificationColumns(
  activityId,
  data
) {

  const sb =
    getSupabase();

  const {
    error
  } = await sb
    .from("records")
    .update({

      documentation_domain:
        data.documentationDomain ||
        null,

      school_project:
        data.schoolProject ||
        null,

      activity_category:
        data.activityCategory ||
        null,

      execution_context:
        data.executionContext ||
        null,

      parent_participation:
        data.parentParticipation ||
        "none",

      student_committee_name:
        data.studentCommitteeName ||
        null,

      beneficiary_count:
        data.beneficiaryCount,

      benefit_times:
        data.benefitTimes

    })
    .eq(
      "id",
      activityId
    );

  if (error) {
    throw error;
  }
}


/* =========================================================
   حفظ التوثيق
   ========================================================= */

async function saveActivity() {

  if (!validateForm()) {
    return;
  }

  const saveButton =
    byId("saveBtn");

  const originalText =
    saveButton?.textContent ||
    "💾 حفظ التوثيق";

  try {

    if (saveButton) {

      saveButton.disabled =
        true;

      saveButton.textContent =
        "جاري الحفظ...";
    }

    const data =
      collectFormData();

    const isNew =
      !currentId;

    const activityId =
      currentId ||
      createActivityId();

    /*
      عند تعديل سجل معلمة بواسطة المنسقة:
      نحتفظ بالمنفذة الأصلية.
    */
    const mainExecutorId =
      isNew
        ? currentUser.id
        : (
            loadedRecordOwnerId ||
            currentUser.id
          );

    /*
      لا نسمح لاسم المنسقة الموجود في الصفحة
      أن يحل محل اسم صاحبة السجل.
    */
    if (
      !isNew &&
      loadedRecordOwnerName
    ) {

      data.executor =
        loadedRecordOwnerName;
    }

    const allImagePaths =
      await uploadNewImages(
        activityId
      );

    remoteImagePaths =
      [
        ...allImagePaths
      ];

    const payload = {

      ...data,

      id:
        activityId,

      image_paths:
        [...allImagePaths],

      beneficiaryCount:
        data.beneficiaryCount,

      beneficiary_count:
        data.beneficiaryCount,

      benefitTimes:
        data.benefitTimes,

      benefit_times:
        data.benefitTimes,

      count:
        data.benefitTimes === null
          ? ""
          : String(
              data.benefitTimes
            ),

      schoolProject:
        data.schoolProject,

      school_project:
        data.schoolProject,

      activityCategory:
        data.activityCategory,

      activity_category:
        data.activityCategory,

      activityCategorySelection:
        data.activityCategorySelection,

      otherActivityCategory:
        data.otherActivityCategory,

      executor:
        data.executor
    };

    if (
      !window.WRGraph ||
      typeof WRGraph.uploadJson !==
        "function"
    ) {

      throw new Error(
        "خدمة حفظ التوثيق غير متاحة."
      );
    }

    /*
      في السجل الجديد المستخدم الحالي هو المنشئ.

      في السجل الموجود نمرر صاحبة السجل الأصلية
      بدل تحويل الملكية إلى المنسقة.
    */
    await WRGraph.uploadJson({

      id:
        activityId,

      type:
        "activity",

      title:
        data.name,

      date:
        data.date,

      user:
        mainExecutorId,

      ...payload
    });

    await updateClassificationColumns(
      activityId,
      data
    );

    await saveParticipants(
      activityId,
      mainExecutorId
    );

    currentId =
      activityId;

    loadedRecordOwnerId =
      mainExecutorId;

    if (
      !loadedRecordOwnerName
    ) {

      loadedRecordOwnerName =
        data.executor ||
        currentProfile?.full_name ||
        "";
    }

    selectedFiles = [];

    if (
      byId("images")
    ) {

      byId(
        "images"
      ).value = "";
    }

    clearDraft();

    if (
      byId("draftState")
    ) {

      byId(
        "draftState"
      ).textContent =
        "تم حفظ التوثيق في المنظومة.";
    }

    if (
      byId("pageTitle")
    ) {

      byId(
        "pageTitle"
      ).textContent =
        "تعديل التوثيق";
    }

    await renderImages();

    updatePreview();

    updateDeleteButton();

    const newUrl =
      new URL(
        window.location.href
      );

    newUrl.searchParams.set(
      "id",
      activityId
    );

    history.replaceState(
      {},
      "",
      newUrl
    );

    showMessage(
      "تم حفظ التوثيق بنجاح."
    );

  } catch (error) {

    console.error(
      "saveActivity:",
      error
    );

    showMessage(
      "تعذر حفظ التوثيق. راجعي البيانات والصلاحيات ثم حاولي مرة أخرى."
    );

  } finally {

    if (saveButton) {

      saveButton.disabled =
        false;

      saveButton.textContent =
        originalText;
    }
  }
}


/* =========================================================
   اختيار الصور
   ========================================================= */

function handleImageSelection(event) {
  const MAX_IMAGES = 3;
  const available = Math.max(0, MAX_IMAGES - remoteImagePaths.length);
  const files = [...(event?.target?.files || [])];
  const valid = files.filter(file => file.type.startsWith("image/"));
  if (valid.length > available) {
    showMessage(available === 0
      ? "التقرير يحتوي بالفعل على 3 صور."
      : `يمكن إضافة ${available} صورة فقط؛ لأن الحد الأقصى 3 صور للتقرير.`);
  }
  selectedFiles = valid.slice(0, available);
  // Reset the native file picker so it does not imply that rejected files were selected.
  if (event?.target) event.target.value = "";
  renderImages();
  scheduleDraft();
}


/* =========================================================
   رابط الصورة المحفوظة
   ========================================================= */

async function getStoredImageUrl(
  path
) {

  const raw =
    String(
      path || ""
    ).trim();

  if (!raw) {
    return "";
  }

  /*
    لو الرابط سبق تحويله في نفس الجلسة
    لا نطلب Signed URL جديدًا كل مرة.
    ده يسرع الطباعة جدًا.
  */
  if (
    imageUrlCache.has(raw)
  ) {

    return imageUrlCache.get(
      raw
    );
  }

  if (
    /^https?:\/\//i.test(
      raw
    )
  ) {

    imageUrlCache.set(
      raw,
      raw
    );

    return raw;
  }

  const cleanPath =
    raw
      .replace(
        /^\/+/,
        ""
      )
      .replace(
        /^wrso-files\//,
        ""
      );

  try {

    const sb =
      getSupabase();

    const {
      data,
      error
    } = await sb
      .storage
      .from(
        "wrso-files"
      )
      .createSignedUrl(
        cleanPath,
        60 * 60 * 2
      );

    if (
      !error &&
      data?.signedUrl
    ) {

      imageUrlCache.set(
        raw,
        data.signedUrl
      );

      return data.signedUrl;
    }

  } catch (error) {

    console.warn(
      "Signed image URL:",
      error
    );
  }

  try {

    if (
      window.WRGraph &&
      typeof WRGraph.getFileUrl ===
        "function"
    ) {

      const url =
        await WRGraph.getFileUrl(
          cleanPath
        );

      if (url) {

        imageUrlCache.set(
          raw,
          url
        );

        return url;
      }
    }

  } catch (error) {

    console.warn(
      "WRGraph image URL:",
      error
    );
  }

  return "";
}


/* =========================================================
   انتظار تحميل الصورة
   ========================================================= */

function waitForImage(
  image
) {

  return new Promise(
    resolve => {

      if (
        image.complete &&
        image.naturalWidth > 0
      ) {

        resolve(true);
        return;
      }

      let finished =
        false;

      const finish =
        value => {

          if (finished) {
            return;
          }

          finished =
            true;

          clearTimeout(
            timer
          );

          resolve(value);
        };

      image.addEventListener(
        "load",
        () =>
          finish(true),
        {
          once: true
        }
      );

      image.addEventListener(
        "error",
        () =>
          finish(false),
        {
          once: true
        }
      );

      const timer =
        setTimeout(
          () =>
            finish(false),
          5000
        );
    }
  );
}


/* =========================================================
   تجهيز الصورة للطباعة
   ========================================================= */

async function ensureImageReady(
  image
) {

  if (!image) {
    return;
  }

  if (
    !image.complete ||
    image.naturalWidth === 0
  ) {

    await waitForImage(
      image
    );
  }

  /*
    decode يجعل المتصفح ينهي فك الصورة
    قبل فتح نافذة الطباعة.
  */
  if (
    typeof image.decode ===
      "function"
  ) {

    try {

      await image.decode();

    } catch {}
  }
}


/* =========================================================
   عرض الصور
   ========================================================= */

let imageRenderVersion = 0;

async function renderImages() {

  const container =
    byId("pImages");

  if (!container) {
    return;
  }

  const version =
    ++imageRenderVersion;

  container.innerHTML = "";
  const noImages = byId("noImages");
  if (noImages) noImages.style.display =
    (remoteImagePaths.length + selectedFiles.length) ? "none" : "";

  const imagePromises = [];

  /*
    الصور المحفوظة
  */
  if (
    remoteImagePaths.length
  ) {

    const resolved =
      await Promise.all(
        remoteImagePaths.map(
          async path => ({
            path,
            url:
              await getStoredImageUrl(
                path
              )
          })
        )
      );

    if (
      version !==
      imageRenderVersion
    ) {
      return;
    }

    resolved.forEach(
      item => {

        if (!item.url) {
          return;
        }

        const image =
          document.createElement(
            "img"
          );

        image.src =
          item.url;

        image.alt =
          "صورة توثيق";

        image.loading =
          "eager";

        image.decoding =
          "sync";

        container.appendChild(
          image
        );

        imagePromises.push(
          ensureImageReady(
            image
          )
        );
      }
    );
  }

  /*
    الصور الجديدة قبل الحفظ
  */
  selectedFiles.forEach(
    file => {

      const image =
        document.createElement(
          "img"
        );

      const objectUrl =
        URL.createObjectURL(
          file
        );

      image.src =
        objectUrl;

      image.alt =
        "صورة توثيق";

      image.loading =
        "eager";

      image.decoding =
        "sync";

      image.addEventListener(
        "load",
        () => {

          /*
            نترك الرابط موجودًا حتى تنتهي
            عملية الرسم ثم يتم تحريره.
          */
          setTimeout(
            () =>
              URL.revokeObjectURL(
                objectUrl
              ),
            1000
          );
        },
        {
          once: true
        }
      );

      container.appendChild(
        image
      );

      imagePromises.push(
        ensureImageReady(
          image
        )
      );
    }
  );

  await Promise.allSettled(
    imagePromises
  );
}


/* =========================================================
   صلاحية حذف السجل الحالي
   ========================================================= */

function canDeleteCurrentRecord() {

  if (
    !currentId ||
    !currentUser
  ) {
    return false;
  }

  const role =
    String(
      currentProfile?.role ||
      ""
    ).toLowerCase();

  if (
    role === "admin" ||
    role === "system_admin" ||
    role === "coordinator"
  ) {
    return true;
  }

  return (
    String(
      loadedRecordOwnerId ||
      ""
    ) ===
    String(
      currentUser.id
    )
  );
}


/* =========================================================
   زر الحذف
   ========================================================= */

function updateDeleteButton() {

  const button =
    byId("deleteBtn");

  if (!button) {
    return;
  }

  button.style.display =
    canDeleteCurrentRecord()
      ? ""
      : "none";
}


/* =========================================================
   حذف التوثيق
   ========================================================= */

async function deleteActivity() {

  if (
    !currentId ||
    !canDeleteCurrentRecord()
  ) {

    showMessage(
      "ليس لديك صلاحية حذف هذا التوثيق."
    );

    return;
  }

  const confirmed =
    confirm(
      "هل أنتِ متأكدة من حذف هذا التوثيق؟\n\nلن يمكن التراجع عن الحذف."
    );

  if (!confirmed) {
    return;
  }

  const button =
    byId("deleteBtn");

  const originalText =
    button?.textContent ||
    "حذف";

  try {

    if (button) {

      button.disabled =
        true;

      button.textContent =
        "جاري الحذف...";
    }

    const sb =
      getSupabase();

    /*
      نحذف المشاركين أولًا.
    */
    const {
      error: participantsError
    } = await sb
      .from(
        "activity_participants"
      )
      .delete()
      .eq(
        "activity_id",
        currentId
      );

    if (
      participantsError
    ) {

      console.warn(
        "Delete participants:",
        participantsError
      );
    }

    /*
      ثم السجل.
      RLS هي الحكم النهائي للصلاحية.
    */
    const {
      error
    } = await sb
      .from("records")
      .delete()
      .eq(
        "id",
        currentId
      );

    if (error) {
      throw error;
    }

    clearDraft();

    showMessage(
      "تم حذف التوثيق."
    );

    setTimeout(
      () => {

        if (
          document.referrer
        ) {

          history.back();

        } else {

          location.href =
            "../index.html";
        }

      },
      300
    );

  } catch (error) {

    console.error(
      "deleteActivity:",
      error
    );

    showMessage(
      "تعذر حذف التوثيق. تأكدي من الصلاحية ثم حاولي مرة أخرى."
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        originalText;
    }
  }
}


/* =========================================================
   إعادة تعيين النموذج
   ========================================================= */

function resetForm() {

  const confirmed =
    confirm(
      "هل تريدين مسح البيانات الحالية والبدء من جديد؟"
    );

  if (!confirmed) {
    return;
  }

  const form =
    byId(
      "activityForm"
    );

  form?.reset();

  selectedFiles = [];

  remoteImagePaths = [];

  selectedCoExecutorIds = [];

  imageUrlCache.clear();

  if (
    byId("images")
  ) {

    byId("images").value =
      "";
  }

  if (
    byId("executor")
  ) {

    byId("executor").value =
      currentProfile?.full_name ||
      currentUser?.email ||
      "";
  }

  refreshSchoolProjects();

  refreshActivityCategories();

  updateOtherCategoryVisibility();

  updateCommitteeVisibility();

  renderCoExecutors();

  renderImages();

  updatePreview();

  clearDraft();

  if (
    byId("draftState")
  ) {

    byId(
      "draftState"
    ).textContent =
      "";
  }
}


/* =========================================================
   تنزيل التقرير HTML
   ========================================================= */

function downloadReport() {

  updatePreview();

  const report =
    byId("report");

  if (!report) {

    showMessage(
      "تعذر العثور على التقرير."
    );

    return;
  }

  const html =
`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${esc(
  valueOf("name") ||
  "تقرير فعالية"
)}</title>
<style>
body{
  font-family:Arial,Tahoma,sans-serif;
  direction:rtl;
  margin:30px;
}
img{
  max-width:100%;
  height:auto;
}
</style>
</head>
<body>
${report.outerHTML}
</body>
</html>`;

  const blob =
    new Blob(
      [html],
      {
        type:
          "text/html;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    `${
      valueOf("name") ||
      "activity-report"
    }.html`;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );
}


/* =========================================================
   طباعة التقرير
   ========================================================= */

async function printReport() {

  updatePreview();

  /*
    لو الصور معروضة بالفعل لا نعيد
    إنشاء Signed URLs من الصفر.

    فقط نتأكد أن المتصفح أنهى تحميلها.
  */
  let images =
    [
      ...document.querySelectorAll(
        "#pImages img"
      )
    ];

  /*
    لو لم تكن الصور مرسومة لأي سبب
    نرسمها مرة واحدة.
  */
  if (
    !images.length &&
    (
      remoteImagePaths.length ||
      selectedFiles.length
    )
  ) {

    await renderImages();

    images =
      [
        ...document.querySelectorAll(
          "#pImages img"
        )
      ];
  }

  await Promise.allSettled(
    images.map(
      image =>
        ensureImageReady(
          image
        )
    )
  );

  /*
    نعطي المتصفح إطارين للرسم قبل print.
    ده مهم لظهور الصور داخل Save as PDF.
  */
  await new Promise(
    resolve =>
      requestAnimationFrame(
        () =>
          requestAnimationFrame(
            resolve
          )
      )
  );

  window.print();
}


/* =========================================================
   إرسال بالبريد
   ========================================================= */

function emailReport() {

  const data =
    collectFormData();

  const subject =
    encodeURIComponent(
      `تقرير فعالية: ${
        data.name ||
        "فعالية مدرسية"
      }`
    );

  const body =
    encodeURIComponent(
`اسم الفعالية: ${data.name}

المجال:
${
  ACTIVITY_DOMAIN_LABELS[
    data.documentationDomain
  ] || ""
}

المشروع:
${data.schoolProject}

نوع التوثيق:
${data.activityCategory}

التاريخ:
${formatDate(data.date)}

المنفذة الرئيسية:
${data.executor}

المشاركات في التنفيذ:
${data.coExecutors.join("، ")}

القسم:
${data.departments.join("، ")}

الهدف:
${data.goal}

التنفيذ:
${data.implementation}

النتائج:
${data.results}

التوصيات:
${data.recommendations}

الملاحظات:
${data.notes}`
    );

  window.location.href =
    `mailto:?subject=${subject}&body=${body}`;
}


/* =========================================================
   ربط الأحداث
   ========================================================= */

function bindEvents() {

  const form =
    byId(
      "activityForm"
    );

  if (form) {

    form.addEventListener(
      "submit",
      event => {

        event.preventDefault();

        saveActivity();
      }
    );

    form.addEventListener(
      "input",
      event => {

        if (
          event.target?.id !==
          "images"
        ) {

          updatePreview();

          scheduleDraft();
        }
      }
    );

    form.addEventListener(
      "change",
      event => {

        const target =
          event.target;

        if (!target) {
          return;
        }

        if (
          target.id ===
          "documentationDomain"
        ) {

          refreshSchoolProjects();

          refreshActivityCategories();

          updateCommitteeVisibility();
        }

        if (
          target.id ===
          "activityCategory"
        ) {

          updateOtherCategoryVisibility();

          updateCommitteeVisibility();
        }

        updatePreview();

        scheduleDraft();
      }
    );
  }

  byId("images")
    ?.addEventListener(
      "change",
      handleImageSelection
    );

  byId("saveBtn")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.currentTarget
            ?.type !== "submit"
        ) {

          event.preventDefault();

          saveActivity();
        }
      }
    );

  byId("deleteBtn")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        deleteActivity();
      }
    );

  byId("resetBtn")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        resetForm();
      }
    );

  byId("printBtn")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        printReport();
      }
    );

  byId("downloadBtn")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        downloadReport();
      }
    );

  byId("emailBtn")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        emailReport();
      }
    );
}


/* =========================================================
   التهيئة
   ========================================================= */

async function init() {

  currentId =
    getRecordIdFromUrl();

  bindEvents();

  await loadCurrentUser();

  if (!currentUser) {
    return;
  }

  await loadSchoolYear();

  await loadDepartments();

  await loadActivityUsers();

  refreshSchoolProjects();

  refreshActivityCategories();

  updateOtherCategoryVisibility();

  updateCommitteeVisibility();

  if (currentId) {

    /*
      سجل موجود:
      لا نسترجع المسودة المحلية فوقه.
    */
    await loadExistingRecord();

  } else {

    loadedRecordOwnerId =
      currentUser.id;

    loadedRecordOwnerName =
      currentProfile?.full_name ||
      currentUser.email ||
      "";

    if (
      byId("executor")
    ) {

      byId("executor").value =
        loadedRecordOwnerName;
    }

    restoreDraft();

    updatePreview();

    renderImages();
  }

  updateDeleteButton();
}


/* =========================================================
   بدء التشغيل
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();
}
