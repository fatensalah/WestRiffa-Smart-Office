"use strict";

/* =========================================================
   WestRiffa Smart Office
   إدارة المستخدمين والصلاحيات
   js/users.js
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

if (
  !window.supabase ||
  !window.WR_CONFIG ||
  !window.WR_CONFIG.supabaseUrl ||
  !window.WR_CONFIG.supabaseKey
) {
  throw new Error("تعذر تحميل إعدادات Supabase.");
}

const sb = window.supabase.createClient(
  window.WR_CONFIG.supabaseUrl,
  window.WR_CONFIG.supabaseKey
);


/* =========================================================
   عناصر الصفحة
   ========================================================= */

const usersLoading =
  document.getElementById("usersLoading");

const usersPage =
  document.getElementById("usersPage");

const currentUserName =
  document.getElementById("currentUserName");

const logoutBtn =
  document.getElementById("logoutBtn");

const addUserBtn =
  document.getElementById("addUserBtn");

const refreshUsersBtn =
  document.getElementById("refreshUsersBtn");

const userSearch =
  document.getElementById("userSearch");

const roleFilter =
  document.getElementById("roleFilter");

const departmentFilter =
  document.getElementById("departmentFilter");

const usersTableBody =
  document.getElementById("usersTableBody");

const totalUsers =
  document.getElementById("totalUsers");

const teacherCount =
  document.getElementById("teacherCount");

const coordinatorCount =
  document.getElementById("coordinatorCount");

const adminCount =
  document.getElementById("adminCount");


/* =========================================================
   نافذة المستخدم
   ========================================================= */

const userModal =
  document.getElementById("userModal");

const userModalTitle =
  document.getElementById("userModalTitle");

const userModalSubtitle =
  document.getElementById("userModalSubtitle");

const closeUserModal =
  document.getElementById("closeUserModal");

const cancelUserBtn =
  document.getElementById("cancelUserBtn");

const saveUserBtn =
  document.getElementById("saveUserBtn");

const userModalMessage =
  document.getElementById("userModalMessage");

const editingUserId =
  document.getElementById("editingUserId");

const userFullName =
  document.getElementById("userFullName");

const userEmail =
  document.getElementById("userEmail");

const userRole =
  document.getElementById("userRole");

const userJobTitle =
  document.getElementById("userJobTitle");

const userPassword =
  document.getElementById("userPassword");

const passwordFieldWrap =
  document.getElementById("passwordFieldWrap");

const departmentsFieldWrap =
  document.getElementById("departmentsFieldWrap");

const departmentsCheckboxes =
  document.getElementById("departmentsCheckboxes");


/* =========================================================
   نافذة كلمة المرور
   ========================================================= */

const passwordAdminModal =
  document.getElementById("passwordAdminModal");

const passwordTargetName =
  document.getElementById("passwordTargetName");

const passwordTargetId =
  document.getElementById("passwordTargetId");

const adminNewPassword =
  document.getElementById("adminNewPassword");

const adminConfirmPassword =
  document.getElementById("adminConfirmPassword");

const saveAdminPassword =
  document.getElementById("saveAdminPassword");

const cancelPasswordModal =
  document.getElementById("cancelPasswordModal");

const closePasswordModal =
  document.getElementById("closePasswordModal");

const passwordAdminMessage =
  document.getElementById("passwordAdminMessage");


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let users = [];
let departments = [];


/* =========================================================
   HELPERS
   ========================================================= */

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}


function roleLabel(role) {
  const labels = {
    teacher: "معلمة",
    coordinator: "منسقة",
    admin: "قيادة عليا",
    system_admin: "مسؤول النظام"
  };

  return labels[role] || "غير محدد";
}


function roleClass(role) {
  const allowed = [
    "teacher",
    "coordinator",
    "admin",
    "system_admin"
  ];

  return allowed.includes(role)
    ? `role-${role}`
    : "role-teacher";
}


function setMessage(
  element,
  text,
  type = "error"
) {
  if (!element) return;

  element.textContent = text || "";

  if (!text) {
    element.style.color = "";
    return;
  }

  element.style.color =
    type === "success"
      ? "#087451"
      : "#b42318";
}


function setButtonBusy(
  button,
  busy,
  busyText = "جارٍ الحفظ..."
) {
  if (!button) return;

  if (busy) {
    if (!button.dataset.originalText) {
      button.dataset.originalText =
        button.textContent;
    }

    button.textContent =
      busyText;

    button.disabled =
      true;

  } else {

    button.textContent =
      button.dataset.originalText ||
      button.textContent;

    button.disabled =
      false;
  }
}


/* =========================================================
   الاسم المعروض للمستخدم
   ========================================================= */

function hasRealUserName(user) {
  const fullName =
    normalize(user?.full_name);

  const email =
    normalize(user?.email);

  if (!fullName) {
    return false;
  }

  if (
    email &&
    fullName === email
  ) {
    return false;
  }

  return true;
}


function displayUserName(user) {
  if (
    hasRealUserName(user)
  ) {
    return String(
      user.full_name
    ).trim();
  }

  return "الاسم غير مسجل";
}


/* =========================================================
   اسم القسم
   ========================================================= */

function departmentName(department) {
  if (!department) {
    return "";
  }

  return (
    department.name ||
    department.department_name ||
    department.title ||
    department.label ||
    department.department ||
    ""
  );
}


/* =========================================================
   استدعاء Edge Function
   ========================================================= */

async function invokeManageUsers(payload) {

  const {
    data: { session },
    error: sessionError
  } =
    await sb.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error(
      "انتهت جلسة تسجيل الدخول. سجلي الدخول مرة أخرى."
    );
  }

  const {
    data,
    error
  } =
    await sb.functions.invoke(
      "manage-users",
      {
        body: payload
      }
    );

  if (error) {

    let message =
      error.message ||
      "تعذر تنفيذ العملية.";

    try {

      if (
        error.context &&
        typeof error.context.json ===
          "function"
      ) {

        const details =
          await error.context.json();

        if (
          details?.error
        ) {
          message =
            details.error;
        }
      }

    } catch (_) {
      /* لا شيء */
    }

    throw new Error(
      message
    );
  }

  if (!data) {
    throw new Error(
      "لم تصل استجابة من خدمة إدارة المستخدمين."
    );
  }

  if (
    data.ok === false
  ) {
    throw new Error(
      data.error ||
      "تعذر تنفيذ العملية."
    );
  }

  return data;
}


/* =========================================================
   التحقق من الدخول والصلاحية
   ========================================================= */

async function checkAccess() {

  const {
    data: { session },
    error: sessionError
  } =
    await sb.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {

    window.location.href =
      "../../index.html";

    return false;
  }

  currentUser =
    session.user;

  const {
    data: profile,
    error: profileError
  } =
    await sb
      .from("profiles")
      .select(
        "id, full_name, role, job_title, email"
      )
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error(
      "لم يتم العثور على ملف المستخدم الحالي."
    );
  }

  currentProfile =
    profile;

  if (
    normalize(profile.role) !==
    "system_admin"
  ) {

    alert(
      "هذه الصفحة مخصصة لمسؤول النظام فقط."
    );

    window.location.href =
      "../../index.html";

    return false;
  }

  if (currentUserName) {

    currentUserName.textContent =
      profile.full_name ||
      currentUser.email ||
      "مسؤول النظام";
  }

  return true;
}


/* =========================================================
   تحميل البيانات
   ========================================================= */

async function loadData() {

  usersTableBody.innerHTML = `
    <tr>
      <td
        colspan="6"
        class="users-empty"
      >
        جارٍ تحميل المستخدمين...
      </td>
    </tr>
  `;

  const result =
    await invokeManageUsers({
      action: "list"
    });

  users =
    Array.isArray(
      result.users
    )
      ? result.users
      : [];

  departments =
    Array.isArray(
      result.departments
    )
      ? result.departments
      : [];

  populateDepartmentFilter();

  renderDepartmentCheckboxes();

  renderUsers();
}


/* =========================================================
   أقسام المستخدم
   ========================================================= */

function getUserDepartmentIds(userId) {

  const user =
    users.find(
      item =>
        String(item.id) ===
        String(userId)
    );

  if (!user) {
    return [];
  }

  const assignments =
    Array.isArray(
      user.departments
    )
      ? user.departments
      : [];

  return assignments
    .map(
      assignment =>
        String(
          assignment.department_id ||
          ""
        )
    )
    .filter(Boolean);
}


function getUserDepartmentNames(userId) {

  const ids =
    getUserDepartmentIds(
      userId
    );

  return departments
    .filter(
      department =>
        ids.includes(
          String(
            department.id
          )
        )
    )
    .map(
      departmentName
    )
    .filter(Boolean);
}


/* =========================================================
   فلتر الأقسام
   ========================================================= */

function populateDepartmentFilter() {

  if (!departmentFilter) {
    return;
  }

  const previousValue =
    departmentFilter.value;

  departmentFilter.innerHTML =
    `<option value="">جميع الأقسام</option>`;

  departments
    .slice()
    .sort(
      (a, b) =>
        departmentName(a)
          .localeCompare(
            departmentName(b),
            "ar"
          )
    )
    .forEach(
      department => {

        const name =
          departmentName(
            department
          );

        if (!name) {
          return;
        }

        const option =
          document.createElement(
            "option"
          );

        option.value =
          department.id;

        option.textContent =
          name;

        departmentFilter
          .appendChild(
            option
          );
      }
    );

  const stillExists =
    Array.from(
      departmentFilter.options
    ).some(
      option =>
        option.value ===
        previousValue
    );

  if (stillExists) {

    departmentFilter.value =
      previousValue;
  }
}


/* =========================================================
   مربعات اختيار الأقسام
   ========================================================= */

function renderDepartmentCheckboxes() {

  if (!departmentsCheckboxes) {
    return;
  }

  if (!departments.length) {

    departmentsCheckboxes.innerHTML = `
      <div class="small">
        لا توجد أقسام مسجلة.
      </div>
    `;

    return;
  }

  departmentsCheckboxes.innerHTML =
    departments
      .slice()
      .sort(
        (a, b) =>
          departmentName(a)
            .localeCompare(
              departmentName(b),
              "ar"
            )
      )
      .map(
        department => {

          const name =
            departmentName(
              department
            );

          if (!name) {
            return "";
          }

          return `
            <div
              class="department-option"
            >

              <input
                type="checkbox"
                class="department-check"
                id="department_${esc(department.id)}"
                value="${esc(department.id)}"
              >

              <label
                for="department_${esc(department.id)}"
              >
                ${esc(name)}
              </label>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   الإحصائيات
   ========================================================= */

function renderStats() {

  if (totalUsers) {

    totalUsers.textContent =
      users.length;
  }

  if (teacherCount) {

    teacherCount.textContent =
      users.filter(
        user =>
          normalize(user.role) ===
          "teacher"
      ).length;
  }

  if (coordinatorCount) {

    coordinatorCount.textContent =
      users.filter(
        user =>
          normalize(user.role) ===
          "coordinator"
      ).length;
  }

  if (adminCount) {

    adminCount.textContent =
      users.filter(
        user =>
          [
            "admin",
            "system_admin"
          ].includes(
            normalize(
              user.role
            )
          )
      ).length;
  }
}


/* =========================================================
   حالة الحساب
   ========================================================= */

function getUserStatus(user) {

  if (
    user.auth_missing
  ) {

    return {
      text:
        "حساب Auth مفقود",

      className:
        "status-disabled"
    };
  }

  if (
    user.disabled
  ) {

    return {
      text:
        "معطل",

      className:
        "status-disabled"
    };
  }

  return {
    text:
      "فعال",

    className:
      "status-active"
  };
}


/* =========================================================
   عرض الجدول
   ========================================================= */

function renderUsers() {

  renderStats();

  const search =
    normalize(
      userSearch?.value
    );

  const selectedRole =
    normalize(
      roleFilter?.value
    );

  const selectedDepartment =
    String(
      departmentFilter?.value ||
      ""
    );


  const filtered =
    users.filter(
      user => {

        const searchable =
          normalize(
            [
              user.full_name,
              user.email,
              user.employee_no,
              user.job_title,
              user.specialization
            ].join(" ")
          );


        if (
          search &&
          !searchable.includes(
            search
          )
        ) {
          return false;
        }


        if (
          selectedRole &&
          normalize(user.role) !==
            selectedRole
        ) {
          return false;
        }


        if (
          selectedDepartment
        ) {

          const ids =
            getUserDepartmentIds(
              user.id
            );

          if (
            !ids.includes(
              selectedDepartment
            )
          ) {
            return false;
          }
        }

        return true;
      }
    );


  if (!filtered.length) {

    usersTableBody.innerHTML = `
      <tr>

        <td
          colspan="6"
          class="users-empty"
        >
          لا توجد حسابات مطابقة للبحث.
        </td>

      </tr>
    `;

    return;
  }


  usersTableBody.innerHTML =
    filtered
      .map(
        user => {

          const role =
            normalize(
              user.role
            );

          const departmentNames =
            getUserDepartmentNames(
              user.id
            );

          const isCurrentUser =
            currentUser &&
            String(user.id) ===
            String(currentUser.id);

          const status =
            getUserStatus(
              user
            );

          const authMissing =
            Boolean(
              user.auth_missing
            );

          const hasName =
            hasRealUserName(
              user
            );

          const visibleName =
            displayUserName(
              user
            );


          let activationButton =
            "";


          if (
            !isCurrentUser &&
            !authMissing
          ) {

            if (
              user.disabled
            ) {

              activationButton = `
                <button
                  class="mini-btn mini-edit"
                  type="button"
                  data-action="enable"
                  data-id="${esc(user.id)}"
                >
                  تفعيل
                </button>
              `;

            } else {

              activationButton = `
                <button
                  class="mini-btn mini-disable"
                  type="button"
                  data-action="disable"
                  data-id="${esc(user.id)}"
                >
                  تعطيل
                </button>
              `;
            }
          }


          return `
            <tr>

              <td>

                <div
                  class="user-name-cell"
                >

                  <strong
                    ${
                      !hasName
                        ? 'style="color:#b7791f;"'
                        : ""
                    }
                  >

                    ${esc(
                      visibleName
                    )}

                    ${
                      isCurrentUser
                        ? " • حسابك"
                        : ""
                    }

                  </strong>


                  <small>
                    ${esc(
                      user.email ||
                      "بدون بريد"
                    )}
                  </small>


                  ${
                    !hasName
                      ? `
                        <small
                          style="
                            display:inline-block;
                            width:max-content;
                            margin-top:5px;
                            padding:3px 8px;
                            border-radius:999px;
                            background:#fff7e6;
                            color:#9a6700;
                            font-size:11px;
                            font-weight:700;
                          "
                        >
                          الاسم غير مكتمل
                        </small>
                      `
                      : ""
                  }

                </div>

              </td>


              <td>

                <span
                  class="role-pill ${roleClass(role)}"
                >
                  ${esc(
                    roleLabel(role)
                  )}
                </span>

              </td>


              <td>

                ${esc(
                  user.job_title ||
                  user.specialization ||
                  "—"
                )}

              </td>


              <td>

                ${
                  departmentNames.length
                    ? departmentNames
                        .map(esc)
                        .join("، ")
                    : "—"
                }

              </td>


              <td>

                <span
                  class="status-pill ${status.className}"
                >
                  ${esc(
                    status.text
                  )}
                </span>

              </td>


              <td>

                <div
                  class="user-actions"
                >

                  <button
                    class="mini-btn mini-edit"
                    type="button"
                    data-action="edit"
                    data-id="${esc(user.id)}"
                  >
                    ${
                      hasName
                        ? "تعديل"
                        : "إضافة الاسم"
                    }
                  </button>


                  ${
                    !authMissing
                      ? `
                        <button
                          class="mini-btn mini-password"
                          type="button"
                          data-action="password"
                          data-id="${esc(user.id)}"
                        >
                          كلمة المرور
                        </button>
                      `
                      : ""
                  }


                  ${activationButton}


                  ${
                    !isCurrentUser
                      ? `
                        <button
                          class="mini-btn mini-delete"
                          type="button"
                          data-action="delete"
                          data-id="${esc(user.id)}"
                        >
                          حذف
                        </button>
                      `
                      : ""
                  }

                </div>

              </td>

            </tr>
          `;
        }
      )
      .join("");
}


/* =========================================================
   الأقسام المختارة
   ========================================================= */

function clearDepartmentChecks() {

  document
    .querySelectorAll(
      ".department-check"
    )
    .forEach(
      checkbox => {

        checkbox.checked =
          false;
      }
    );
}


function getSelectedDepartmentIds() {

  return Array.from(
    document.querySelectorAll(
      ".department-check:checked"
    )
  ).map(
    checkbox =>
      checkbox.value
  );
}


/* =========================================================
   ظهور الأقسام حسب الدور
   ========================================================= */

function updateDepartmentVisibility() {

  const role =
    normalize(
      userRole.value
    );


  if (
    role === "admin" ||
    role === "system_admin"
  ) {

    departmentsFieldWrap.style.display =
      "none";

    clearDepartmentChecks();

  } else {

    departmentsFieldWrap.style.display =
      "";
  }


  if (
    role === "system_admin"
  ) {

    userJobTitle.value =
      "مسؤول النظام";
  }
}


/* =========================================================
   إضافة مستخدم
   ========================================================= */

function openCreateModal() {

  editingUserId.value =
    "";

  userModalTitle.textContent =
    "إضافة مستخدم";

  userModalSubtitle.textContent =
    "إنشاء حساب جديد وتحديد الدور والقسم.";

  userFullName.value =
    "";

  userEmail.value =
    "";

  userRole.value =
    "teacher";

  userJobTitle.value =
    "";

  userPassword.value =
    "";

  passwordFieldWrap.style.display =
    "";

  clearDepartmentChecks();

  updateDepartmentVisibility();

  setMessage(
    userModalMessage,
    ""
  );

  userModal.classList.remove(
    "hidden"
  );

  setTimeout(
    () =>
      userFullName.focus(),
    50
  );
}


/* =========================================================
   تعديل مستخدم
   ========================================================= */

function openEditModal(userId) {

  const user =
    users.find(
      item =>
        String(item.id) ===
        String(userId)
    );

  if (!user) {
    return;
  }


  editingUserId.value =
    user.id;


  const hasName =
    hasRealUserName(
      user
    );


  userModalTitle.textContent =
    hasName
      ? "تعديل المستخدم"
      : "إضافة اسم المستخدم";


  userModalSubtitle.textContent =
    hasName
      ? "تعديل بيانات الحساب والدور والأقسام."
      : "هذا الحساب موجود بالفعل ولكن الاسم غير مسجل. أضيفي الاسم الحقيقي ثم احفظي التعديل.";


  /*
    إذا كان full_name القديم هو نفس البريد
    لا نضعه داخل خانة الاسم.
    نخليها فارغة لتكتبي الاسم الحقيقي.
  */

  userFullName.value =
    hasName
      ? String(
          user.full_name ||
          ""
        ).trim()
      : "";


  userEmail.value =
    user.email ||
    "";


  userRole.value =
    normalize(
      user.role
    ) ||
    "teacher";


  userJobTitle.value =
    user.job_title ||
    "";


  userPassword.value =
    "";


  passwordFieldWrap.style.display =
    "none";


  clearDepartmentChecks();


  const selectedIds =
    getUserDepartmentIds(
      user.id
    );


  document
    .querySelectorAll(
      ".department-check"
    )
    .forEach(
      checkbox => {

        checkbox.checked =
          selectedIds.includes(
            String(
              checkbox.value
            )
          );
      }
    );


  updateDepartmentVisibility();


  setMessage(
    userModalMessage,
    ""
  );


  userModal.classList.remove(
    "hidden"
  );


  setTimeout(
    () =>
      userFullName.focus(),
    50
  );
}


/* =========================================================
   إغلاق نافذة المستخدم
   ========================================================= */

function closeUserEditor() {

  userModal.classList.add(
    "hidden"
  );

  setMessage(
    userModalMessage,
    ""
  );
}


/* =========================================================
   حفظ إضافة / تعديل
   ========================================================= */

async function saveUser() {

  const id =
    editingUserId.value
      .trim();


  const fullName =
    userFullName.value
      .trim();


  const email =
    userEmail.value
      .trim()
      .toLowerCase();


  const role =
    normalize(
      userRole.value
    );


  const jobTitle =
    userJobTitle.value
      .trim();


  const password =
    userPassword.value;


  const departmentIds =
    getSelectedDepartmentIds();


  if (!fullName) {

    setMessage(
      userModalMessage,
      "اكتبي اسم المستخدم."
    );

    userFullName.focus();

    return;
  }


  if (
    normalize(fullName) ===
    normalize(email)
  ) {

    setMessage(
      userModalMessage,
      "اسم المستخدم لا يمكن أن يكون نفس البريد الإلكتروني."
    );

    userFullName.focus();

    return;
  }


  if (!email) {

    setMessage(
      userModalMessage,
      "اكتبي البريد الإلكتروني."
    );

    return;
  }


  if (
    ![
      "teacher",
      "coordinator",
      "admin",
      "system_admin"
    ].includes(role)
  ) {

    setMessage(
      userModalMessage,
      "اختاري نوع الحساب."
    );

    return;
  }


  if (
    !id &&
    password.length < 6
  ) {

    setMessage(
      userModalMessage,
      "كلمة المرور المؤقتة يجب ألا تقل عن 6 أحرف."
    );

    return;
  }


  try {

    setButtonBusy(
      saveUserBtn,
      true
    );


    setMessage(
      userModalMessage,
      ""
    );


    if (!id) {

      await invokeManageUsers({
        action:
          "create",

        full_name:
          fullName,

        email,

        password,

        role,

        job_title:
          jobTitle ||
          null,

        department_ids:
          departmentIds
      });


      setMessage(
        userModalMessage,
        "تم إنشاء الحساب بنجاح.",
        "success"
      );

    } else {

      await invokeManageUsers({
        action:
          "update",

        user_id:
          id,

        full_name:
          fullName,

        email,

        role,

        job_title:
          jobTitle ||
          null,

        department_ids:
          departmentIds
      });


      setMessage(
        userModalMessage,
        "تم حفظ بيانات المستخدم بنجاح.",
        "success"
      );
    }


    await loadData();


    setTimeout(
      closeUserEditor,
      500
    );


  } catch (error) {

    console.error(
      "saveUser:",
      error
    );


    setMessage(
      userModalMessage,
      error.message ||
      "تعذر حفظ الحساب."
    );


  } finally {

    setButtonBusy(
      saveUserBtn,
      false
    );
  }
}


/* =========================================================
   كلمة المرور
   ========================================================= */

function openPasswordEditor(userId) {

  const user =
    users.find(
      item =>
        String(item.id) ===
        String(userId)
    );


  if (!user) {
    return;
  }


  if (
    user.auth_missing
  ) {

    alert(
      "هذا الملف لا يملك حساب Auth مرتبطًا به."
    );

    return;
  }


  passwordTargetId.value =
    user.id;


  passwordTargetName.textContent =
    hasRealUserName(user)
      ? user.full_name
      : user.email ||
        "المستخدم";


  adminNewPassword.value =
    "";


  adminConfirmPassword.value =
    "";


  setMessage(
    passwordAdminMessage,
    ""
  );


  passwordAdminModal
    .classList
    .remove(
      "hidden"
    );


  setTimeout(
    () =>
      adminNewPassword.focus(),
    50
  );
}


function closePasswordEditor() {

  passwordAdminModal
    .classList
    .add(
      "hidden"
    );


  adminNewPassword.value =
    "";


  adminConfirmPassword.value =
    "";


  setMessage(
    passwordAdminMessage,
    ""
  );
}


/* =========================================================
   تغيير كلمة المرور
   ========================================================= */

async function changeUserPassword() {

  const userId =
    passwordTargetId.value;


  const password =
    adminNewPassword.value;


  const confirmation =
    adminConfirmPassword.value;


  if (
    password.length < 6
  ) {

    setMessage(
      passwordAdminMessage,
      "كلمة المرور يجب ألا تقل عن 6 أحرف."
    );

    return;
  }


  if (
    password !==
    confirmation
  ) {

    setMessage(
      passwordAdminMessage,
      "كلمتا المرور غير متطابقتين."
    );

    return;
  }


  try {

    setButtonBusy(
      saveAdminPassword,
      true,
      "جارٍ التغيير..."
    );


    await invokeManageUsers({
      action:
        "set_password",

      user_id:
        userId,

      password
    });


    setMessage(
      passwordAdminMessage,
      "تم تغيير كلمة المرور بنجاح.",
      "success"
    );


    setTimeout(
      closePasswordEditor,
      600
    );


  } catch (error) {

    console.error(
      "change password:",
      error
    );


    setMessage(
      passwordAdminMessage,
      error.message ||
      "تعذر تغيير كلمة المرور."
    );


  } finally {

    setButtonBusy(
      saveAdminPassword,
      false
    );
  }
}


/* =========================================================
   تعطيل المستخدم
   ========================================================= */

async function disableUser(userId) {

  const user =
    users.find(
      item =>
        String(item.id) ===
        String(userId)
    );


  if (!user) {
    return;
  }


  if (
    String(userId) ===
    String(currentUser?.id)
  ) {

    alert(
      "لا يمكنك تعطيل حسابك الحالي."
    );

    return;
  }


  const name =
    hasRealUserName(user)
      ? user.full_name
      : user.email;


  const ok =
    confirm(
      `هل تريدين تعطيل حساب "${name}"؟\n\nسيتم الاحتفاظ ببياناته وسجلاته، لكنه لن يستطيع تسجيل الدخول.`
    );


  if (!ok) {
    return;
  }


  try {

    await invokeManageUsers({
      action:
        "disable",

      user_id:
        userId
    });


    await loadData();


    alert(
      "تم تعطيل الحساب بنجاح."
    );


  } catch (error) {

    console.error(
      "disable user:",
      error
    );


    alert(
      error.message ||
      "تعذر تعطيل الحساب."
    );
  }
}


/* =========================================================
   تفعيل المستخدم
   ========================================================= */

async function enableUser(userId) {

  const user =
    users.find(
      item =>
        String(item.id) ===
        String(userId)
    );


  if (!user) {
    return;
  }


  const name =
    hasRealUserName(user)
      ? user.full_name
      : user.email;


  const ok =
    confirm(
      `هل تريدين إعادة تفعيل حساب "${name}"؟`
    );


  if (!ok) {
    return;
  }


  try {

    await invokeManageUsers({
      action:
        "enable",

      user_id:
        userId
    });


    await loadData();


    alert(
      "تم تفعيل الحساب بنجاح."
    );


  } catch (error) {

    console.error(
      "enable user:",
      error
    );


    alert(
      error.message ||
      "تعذر تفعيل الحساب."
    );
  }
}


/* =========================================================
   حذف المستخدم
   ========================================================= */

async function deleteUser(userId) {

  const user =
    users.find(
      item =>
        String(item.id) ===
        String(userId)
    );


  if (!user) {
    return;
  }


  if (
    String(userId) ===
    String(currentUser?.id)
  ) {

    alert(
      "لا يمكنك حذف حسابك الحالي."
    );

    return;
  }


  const name =
    hasRealUserName(user)
      ? user.full_name
      : user.email;


  const firstConfirm =
    confirm(
      `تحذير: هل تريدين حذف حساب "${name}" نهائيًا؟\n\nإذا كان للمستخدم سجلات سابقة، فالأفضل استخدام "تعطيل" بدل الحذف.`
    );


  if (!firstConfirm) {
    return;
  }


  const secondConfirm =
    confirm(
      "تأكيد أخير: الحذف النهائي قد يؤثر في السجلات المرتبطة بالمستخدم. هل تريدين المتابعة؟"
    );


  if (!secondConfirm) {
    return;
  }


  try {

    await invokeManageUsers({
      action:
        "delete",

      user_id:
        userId
    });


    await loadData();


    alert(
      "تم حذف الحساب."
    );


  } catch (error) {

    console.error(
      "delete user:",
      error
    );


    alert(
      error.message ||
      "تعذر حذف الحساب. قد توجد سجلات مرتبطة به."
    );
  }
}


/* =========================================================
   أحداث الجدول
   ========================================================= */

usersTableBody.addEventListener(
  "click",
  async event => {

    const button =
      event.target.closest(
        "[data-action]"
      );


    if (!button) {
      return;
    }


    const action =
      button.dataset.action;


    const userId =
      button.dataset.id;


    if (
      action === "edit"
    ) {

      openEditModal(
        userId
      );

      return;
    }


    if (
      action === "password"
    ) {

      openPasswordEditor(
        userId
      );

      return;
    }


    if (
      action === "disable"
    ) {

      await disableUser(
        userId
      );

      return;
    }


    if (
      action === "enable"
    ) {

      await enableUser(
        userId
      );

      return;
    }


    if (
      action === "delete"
    ) {

      await deleteUser(
        userId
      );
    }
  }
);


/* =========================================================
   EVENTS
   ========================================================= */

if (addUserBtn) {

  addUserBtn.addEventListener(
    "click",
    openCreateModal
  );
}


if (refreshUsersBtn) {

  refreshUsersBtn.addEventListener(
    "click",
    async () => {

      try {

        setButtonBusy(
          refreshUsersBtn,
          true,
          "جارٍ التحديث..."
        );


        await loadData();


      } catch (error) {

        console.error(
          "refresh:",
          error
        );


        alert(
          error.message ||
          "تعذر تحديث بيانات المستخدمين."
        );


      } finally {

        setButtonBusy(
          refreshUsersBtn,
          false
        );
      }
    }
  );
}


if (userSearch) {

  userSearch.addEventListener(
    "input",
    renderUsers
  );
}


if (roleFilter) {

  roleFilter.addEventListener(
    "change",
    renderUsers
  );
}


if (departmentFilter) {

  departmentFilter.addEventListener(
    "change",
    renderUsers
  );
}


if (userRole) {

  userRole.addEventListener(
    "change",
    updateDepartmentVisibility
  );
}


if (saveUserBtn) {

  saveUserBtn.addEventListener(
    "click",
    saveUser
  );
}


if (closeUserModal) {

  closeUserModal.addEventListener(
    "click",
    closeUserEditor
  );
}


if (cancelUserBtn) {

  cancelUserBtn.addEventListener(
    "click",
    closeUserEditor
  );
}


if (saveAdminPassword) {

  saveAdminPassword.addEventListener(
    "click",
    changeUserPassword
  );
}


if (closePasswordModal) {

  closePasswordModal.addEventListener(
    "click",
    closePasswordEditor
  );
}


if (cancelPasswordModal) {

  cancelPasswordModal.addEventListener(
    "click",
    closePasswordEditor
  );
}


/* =========================================================
   تسجيل الخروج
   ========================================================= */

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      await sb.auth.signOut();

      window.location.href =
        "../../index.html";
    }
  );
}


/* =========================================================
   إغلاق النافذة عند الضغط خارجها
   ========================================================= */

if (userModal) {

  userModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        userModal
      ) {

        closeUserEditor();
      }
    }
  );
}


if (passwordAdminModal) {

  passwordAdminModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        passwordAdminModal
      ) {

        closePasswordEditor();
      }
    }
  );
}


/* =========================================================
   ESCAPE
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {
      return;
    }

    closeUserEditor();

    closePasswordEditor();
  }
);


/* =========================================================
   تشغيل الصفحة
   ========================================================= */

async function initUsersPage() {

  try {

    const allowed =
      await checkAccess();


    if (!allowed) {
      return;
    }


    await loadData();


    if (usersLoading) {

      usersLoading.style.display =
        "none";
    }


    if (usersPage) {

      usersPage.classList.add(
        "ready"
      );
    }


  } catch (error) {

    console.error(
      "Users page init error:",
      error
    );


    if (!usersLoading) {

      alert(
        error.message ||
        "تعذر فتح إدارة المستخدمين."
      );

      return;
    }


    usersLoading.style.display =
      "flex";


    usersLoading.innerHTML = `
      <div
        style="
          max-width:650px;
          padding:25px;
          text-align:center;
        "
      >

        <div
          style="
            font-size:32px;
            margin-bottom:12px;
          "
        >
          ⚠️
        </div>

        <div
          style="
            font-weight:700;
          "
        >
          تعذر فتح إدارة المستخدمين
        </div>

        <div
          style="
            margin-top:8px;
            color:#b42318;
            font-size:13px;
            font-weight:400;
            line-height:1.8;
          "
        >
          ${esc(
            error.message ||
            "حدث خطأ غير متوقع."
          )}
        </div>

        <div
          style="
            margin-top:18px;
          "
        >

          <a
            href="../../index.html"
            class="btn btn-soft"
          >
            العودة للرئيسية
          </a>

        </div>

      </div>
    `;
  }
}


/* =========================================================
   START
   ========================================================= */

initUsersPage();