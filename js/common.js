"use strict";


/* =========================================================
   WestRiffa Smart Office
   COMMON SYSTEM
   ========================================================= */


/* =========================================================
   ثوابت التخزين
   ========================================================= */

const WR_KEY =
  "westriffa_full_records_v3";

const WR_QUEUE_KEY =
  "westriffa_sync_queue_v3";

const WR_DB_NAME =
  "WestRiffaSmartOffice";

const WR_DB_VERSION =
  2;


/* =========================================================
   Helpers
   ========================================================= */

const $ =
  (id) =>
    document.getElementById(id);


/* =========================================================
   Supabase
   ========================================================= */

const wrSupabase =
  window.supabase.createClient(
    window.WR_CONFIG.supabaseUrl,
    window.WR_CONFIG.supabaseKey
  );


console.log(
  "Supabase connected:",
  wrSupabase
);


/* =========================================================
   نظام المستخدم والصلاحيات المركزي
   ========================================================= */

let __wrProfileCache =
  null;

let __wrProfileCacheAt =
  0;


/* مدة الاحتفاظ المؤقت بالـProfile */

const WR_PROFILE_CACHE_MS =
  30000;


/* =========================================================
   تنظيف Role
   ========================================================= */

function wrNormalizeRole(
  role
){

  const value =
    String(
      role || ""
    )
      .trim()
      .toLowerCase();


  if(
    value === "admin"
  ){

    return "admin";

  }


  if(
    value === "coordinator"
  ){

    return "coordinator";

  }


  if(
    value === "teacher"
  ){

    return "teacher";

  }


  return null;

}


/* =========================================================
   اسم الصلاحية بالعربي
   ========================================================= */

function wrRoleLabel(
  role
){

  const normalized =
    wrNormalizeRole(
      role
    );


  if(
    normalized === "admin"
  ){

    return "القيادة العليا";

  }


  if(
    normalized === "coordinator"
  ){

    return "القيادة الوسطى";

  }


  if(
    normalized === "teacher"
  ){

    return "معلمة";

  }


  return "مستخدم";

}


/* =========================================================
   قراءة Profile
   تعتمد على WRGraph المركزي
   ========================================================= */

async function wrGetCurrentProfile(
  force = false
){

  const now =
    Date.now();


  if(
    !force &&
    __wrProfileCache &&
    (
      now -
      __wrProfileCacheAt
    ) <
    WR_PROFILE_CACHE_MS
  ){

    return __wrProfileCache;

  }


  if(
    !window.WRGraph ||
    typeof WRGraph.getUserProfile !==
      "function"
  ){

    return null;

  }


  try{

    const profile =
      await WRGraph.getUserProfile();


    if(!profile){

      __wrProfileCache =
        null;

      __wrProfileCacheAt =
        now;

      return null;

    }


    profile.role =
      wrNormalizeRole(
        profile.role
      );


    __wrProfileCache =
      profile;

    __wrProfileCacheAt =
      now;


    return profile;


  }catch(error){

    console.error(
      "wrGetCurrentProfile:",
      error
    );


    return null;

  }

}


/* =========================================================
   مسح Cache المستخدم
   ========================================================= */

function wrClearProfileCache(){

  __wrProfileCache =
    null;

  __wrProfileCacheAt =
    0;

}


/* =========================================================
   هل Admin؟
   ========================================================= */

async function wrIsAdmin(){

  const profile =
    await wrGetCurrentProfile();


  return (
    profile?.role ===
    "admin"
  );

}


/* =========================================================
   هل Coordinator؟
   ========================================================= */

async function wrIsCoordinator(){

  const profile =
    await wrGetCurrentProfile();


  return (
    profile?.role ===
    "coordinator"
  );

}


/* =========================================================
   هل Teacher؟
   ========================================================= */

async function wrIsTeacher(){

  const profile =
    await wrGetCurrentProfile();


  return (
    profile?.role ===
    "teacher"
  );

}


/* =========================================================
   هل قيادة؟
   ========================================================= */

async function wrIsLeadership(){

  const profile =
    await wrGetCurrentProfile();


  return [
    "admin",
    "coordinator"
  ].includes(
    profile?.role
  );

}


/* =========================================================
   مستوى القيادة
   ========================================================= */

async function wrLeadershipLevel(){

  const profile =
    await wrGetCurrentProfile();


  if(
    profile?.role ===
    "admin"
  ){

    return "قيادة عليا";

  }


  if(
    profile?.role ===
    "coordinator"
  ){

    return "قيادة وسطى";

  }


  return null;

}


/* =========================================================
   فحص Role أو عدة Roles
   ========================================================= */

async function wrHasRole(
  roles = []
){

  const profile =
    await wrGetCurrentProfile();


  if(!profile){

    return false;

  }


  const list =
    Array.isArray(
      roles
    )
      ? roles
      : [roles];


  const allowed =
    list
      .map(
        wrNormalizeRole
      )
      .filter(
        Boolean
      );


  return allowed.includes(
    profile.role
  );

}


/* =========================================================
   فحص Permission
   الإدارة لها صلاحية كاملة
   ========================================================= */

async function wrCan(
  permission
){

  const profile =
    await wrGetCurrentProfile();


  if(!profile){

    return false;

  }


  /*
    القيادة العليا:
    كامل صلاحيات الواجهة
  */

  if(
    profile.role ===
    "admin"
  ){

    return true;

  }


  /*
    لو Graph أعاد permissions
  */

  if(
    profile.permissions &&
    Object.prototype
      .hasOwnProperty
      .call(
        profile.permissions,
        permission
      )
  ){

    return Boolean(
      profile.permissions[
        permission
      ]
    );

  }


  /* fallback */

  switch(
    permission
  ){

    case "classroom_visits":

      return [
        "admin",
        "coordinator"
      ].includes(
        profile.role
      );


    case "department_scope":

      return (
        profile.role ===
        "coordinator"
      );


    case "create_own_records":

    case "view_own_records":

      return Boolean(
        profile.role
      );


    case "manage_settings":

    case "view_admin_indicators":

    case "view_all_records":

    case "all_departments":

    case "edit_any_record":

    case "delete_any_record":

    case "manage_users":

      return (
        profile.role ===
        "admin"
      );


    default:

      return false;

  }

}


/* =========================================================
   نطاق المستخدم
   ========================================================= */

async function wrGetAccessScope(){

  /*
    لو Graph يوفر الدالة الجديدة
  */

  if(
    window.WRGraph &&
    typeof WRGraph.getAccessScope ===
      "function"
  ){

    try{

      return await WRGraph
        .getAccessScope();

    }catch(error){

      console.warn(
        "WRGraph.getAccessScope:",
        error
      );

    }

  }


  const profile =
    await wrGetCurrentProfile();


  if(!profile){

    return {

      type:
        "none",

      department_ids:
        [],

      department_names:
        []

    };

  }


  if(
    profile.role ===
    "admin"
  ){

    return {

      type:
        "all",

      department_ids:
        [],

      department_names:
        []

    };

  }


  if(
    profile.role ===
    "coordinator"
  ){

    return {

      type:
        "departments",

      department_ids:
        profile.department_ids ||
        (
          profile.department_id
            ? [
                profile.department_id
              ]
            : []
        ),

      department_names:
        profile.department_names ||
        (
          profile.department_name
            ? [
                profile.department_name
              ]
            : []
        )

    };

  }


  return {

    type:
      "self",

    department_ids:
      profile.department_ids ||
      (
        profile.department_id
          ? [
              profile.department_id
            ]
          : []
      ),

    department_names:
      profile.department_names ||
      (
        profile.department_name
          ? [
              profile.department_name
            ]
          : []
      )

  };

}


/* =========================================================
   الأقسام التابعة للمستخدم
   ========================================================= */

async function wrGetDepartmentIds(){

  const scope =
    await wrGetAccessScope();


  return (
    scope.department_ids ||
    []
  );

}


async function wrGetDepartmentNames(){

  const scope =
    await wrGetAccessScope();


  return (
    scope.department_names ||
    []
  );

}


/* =========================================================
   إنشاء شاشة "غير مصرح"
   ========================================================= */

function wrShowAccessDenied(
  message =
    "ليس لديكِ صلاحية للوصول إلى هذه الصفحة."
){

  document.documentElement
    .style
    .visibility =
      "visible";


  document.body.innerHTML =
    `

      <div
        style="
          max-width:650px;
          margin:70px auto;
          padding:35px;
          background:#fff;
          border:1px solid #e1e9e5;
          border-radius:18px;
          box-shadow:0 8px 28px rgba(0,0,0,.06);
          text-align:center;
          font-family:inherit;
        "
      >

        <div
          style="
            font-size:42px;
            margin-bottom:12px;
          "
        >
          🔒
        </div>

        <h2
          style="
            color:#075c40;
            margin:0 0 10px;
          "
        >
          غير مصرح بالدخول
        </h2>

        <p
          style="
            color:#66776f;
            line-height:1.8;
            margin-bottom:22px;
          "
        >
          ${wrEscapeHtml(
            message
          )}
        </p>

        <a
          href="../../index.html"
          style="
            display:inline-block;
            background:#075c40;
            color:#fff;
            text-decoration:none;
            padding:11px 18px;
            border-radius:10px;
            font-weight:700;
          "
        >
          العودة للرئيسية
        </a>

      </div>

    `;

}


/* =========================================================
   حماية صفحة حسب Roles
   ========================================================= */

async function wrRequireRoles(
  roles = [],
  options = {}
){

  const allowedRoles =
    Array.isArray(
      roles
    )
      ? roles
      : [roles];


  const profile =
    await wrGetCurrentProfile(
      true
    );


  if(!profile){

    if(
      options.redirect !==
      false
    ){

      window.location.replace(
        options.loginUrl ||
        "../../index.html"
      );

    }


    return false;

  }


  /*
    الإدارة لها كامل الصلاحيات
    حتى لو الصفحة طلبت Role آخر.
  */

  if(
    profile.role ===
    "admin"
  ){

    return true;

  }


  const allowed =
    allowedRoles
      .map(
        wrNormalizeRole
      )
      .filter(
        Boolean
      );


  if(
    allowed.includes(
      profile.role
    )
  ){

    return true;

  }


  if(
    options.showDenied !==
    false
  ){

    wrShowAccessDenied(
      options.message ||
      "هذه الصفحة غير متاحة لصلاحية حسابك."
    );

  }


  return false;

}


/* =========================================================
   Admin فقط
   ========================================================= */

async function wrRequireAdmin(
  options = {}
){

  return wrRequireRoles(
    ["admin"],
    options
  );

}


/* =========================================================
   القيادة العليا والوسطى فقط
   ========================================================= */

async function wrRequireLeadership(
  options = {}
){

  return wrRequireRoles(
    [
      "admin",
      "coordinator"
    ],
    options
  );

}


/* =========================================================
   الإدارة والمنسقة والمعلمة
   ========================================================= */

async function wrRequireAuthenticatedRole(
  options = {}
){

  return wrRequireRoles(
    [
      "admin",
      "coordinator",
      "teacher"
    ],
    options
  );

}


/* =========================================================
   عناصر تظهر حسب Role
   الاستخدام:
   data-wr-roles="admin"
   data-wr-roles="admin,coordinator"
   ========================================================= */

async function wrApplyRoleVisibility(){

  const profile =
    await wrGetCurrentProfile();


  if(!profile){

    return;

  }


  const elements =
    document.querySelectorAll(
      "[data-wr-roles]"
    );


  elements.forEach(
    element => {

      const roles =
        String(
          element.getAttribute(
            "data-wr-roles"
          ) ||
          ""
        )
          .split(",")
          .map(
            role =>
              wrNormalizeRole(
                role
              )
          )
          .filter(
            Boolean
          );


      /*
        Admin يرى كل عناصر الأدوار
      */

      const visible =
        profile.role === "admin" ||
        roles.includes(
          profile.role
        );


      element.style.display =
        visible
          ? ""
          : "none";

    }
  );


  /*
    اختصارات إضافية
  */

  document
    .querySelectorAll(
      "[data-admin-only]"
    )
    .forEach(
      element => {

        element.style.display =
          profile.role === "admin"
            ? ""
            : "none";

      }
    );


  document
    .querySelectorAll(
      "[data-leadership-only]"
    )
    .forEach(
      element => {

        element.style.display =
          [
            "admin",
            "coordinator"
          ].includes(
            profile.role
          )
            ? ""
            : "none";

      }
    );


  document
    .querySelectorAll(
      "[data-coordinator-only]"
    )
    .forEach(
      element => {

        element.style.display =
          profile.role ===
          "coordinator"
            ? ""
            : "none";

      }
    );

}


/* =========================================================
   HTML Escape
   ========================================================= */

function wrEscapeHtml(
  value
){

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
   حماية صفحات المنصة الداخلية
   ========================================================= */

async function wrProtectPage(){

  /*
    الصفحة الرئيسية index.html
    هي صفحة تسجيل الدخول.
  */

  const path =
    window.location.pathname
      .toLowerCase();


  const isHomePage =
    path.endsWith(
      "/index.html"
    ) &&
    !path.includes(
      "/pages/"
    );


  const isRoot =
    path === "/" ||
    !path.includes(
      "/pages/"
    );


  if(
    isHomePage ||
    isRoot
  ){

    return true;

  }


  /*
    إخفاء الصفحة لحين
    التأكد من الجلسة.
  */

  document.documentElement
    .style
    .visibility =
      "hidden";


  try{


    if(
      !window.WRGraph ||
      typeof WRGraph.getAccount !==
        "function"
    ){

      throw new Error(
        "نظام تسجيل الدخول غير متاح"
      );

    }


    const user =
      await WRGraph.getAccount();


    if(!user){

      window.location.replace(
        "../../index.html"
      );


      return false;

    }


    document.documentElement
      .style
      .visibility =
        "visible";


    return true;


  }catch(error){


    console.error(
      "Page protection error:",
      error
    );


    window.location.replace(
      "../../index.html"
    );


    return false;

  }

}


/* =========================================================
   تشغيل الحماية تلقائيًا للصفحات الداخلية
   ========================================================= */

if(
  window.location.pathname
    .includes(
      "/pages/"
    )
){

  wrProtectPage();

}


/* =========================================================
   تطبيق ظهور عناصر الصلاحيات تلقائيًا
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    wrApplyRoleVisibility()
      .catch(
        error =>
          console.warn(
            "Role visibility:",
            error
          )
      );

  }
);


/* =========================================================
   Local Storage
   ========================================================= */

function wrGetRecords(){

  try{

    return JSON.parse(
      localStorage.getItem(
        WR_KEY
      )
    ) || [];


  }catch{

    return [];

  }

}


function wrSetRecords(
  records
){

  localStorage.setItem(
    WR_KEY,
    JSON.stringify(
      records
    )
  );


  window.dispatchEvent(
    new Event(
      "wr-records-changed"
    )
  );

}


function wrGetQueue(){

  try{

    return JSON.parse(
      localStorage.getItem(
        WR_QUEUE_KEY
      )
    ) || [];


  }catch{

    return [];

  }

}


function wrSetQueue(
  queue
){

  localStorage.setItem(
    WR_QUEUE_KEY,
    JSON.stringify(
      queue
    )
  );


  window.dispatchEvent(
    new Event(
      "wr-sync-changed"
    )
  );

}


/* =========================================================
   IndexedDB
   ========================================================= */

function wrOpenDB(){

  return new Promise(
    (
      resolve,
      reject
    ) => {


      const request =
        indexedDB.open(
          WR_DB_NAME,
          WR_DB_VERSION
        );


      request.onupgradeneeded =
        () => {


          const db =
            request.result;


          if(
            db.objectStoreNames
              .contains(
                "files"
              )
          ){

            const transaction =
              request.transaction;


            const store =
              transaction
                .objectStore(
                  "files"
                );


            if(
              store.keyPath !==
              "id"
            ){

              db.deleteObjectStore(
                "files"
              );


              db.createObjectStore(
                "files",
                {
                  keyPath:
                    "id"
                }
              );

            }


          }else{


            db.createObjectStore(
              "files",
              {
                keyPath:
                  "id"
              }
            );

          }

        };


      request.onsuccess =
        () =>
          resolve(
            request.result
          );


      request.onerror =
        () =>
          reject(
            request.error
          );

    }
  );

}


/* =========================================================
   حفظ الملفات محليًا
   ========================================================= */

async function wrStoreFile(
  blob,
  meta = {}
){

  const db =
    await wrOpenDB();


  const id =
    `file_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;


  await new Promise(
    (
      resolve,
      reject
    ) => {


      const transaction =
        db.transaction(
          "files",
          "readwrite"
        );


      const store =
        transaction.objectStore(
          "files"
        );


      const request =
        store.put({

          id,

          blob,

          name:
            meta.name ||
            "file",

          type:
            blob.type ||
            meta.type ||
            "application/octet-stream",

          createdAt:
            new Date()
              .toISOString()

        });


      request.onerror =
        () =>
          reject(
            request.error
          );


      transaction.oncomplete =
        resolve;


      transaction.onerror =
        () =>
          reject(
            transaction.error ||
            request.error
          );


      transaction.onabort =
        () =>
          reject(
            transaction.error ||
            new Error(
              "تم إلغاء حفظ الصورة"
            )
          );

    }
  );


  db.close();


  return id;

}


/* =========================================================
   استرجاع ملف
   ========================================================= */

async function wrGetFile(
  id
){

  if(!id){

    return null;

  }


  const db =
    await wrOpenDB();


  const value =
    await new Promise(
      (
        resolve,
        reject
      ) => {


        const request =
          db
            .transaction(
              "files",
              "readonly"
            )
            .objectStore(
              "files"
            )
            .get(
              id
            );


        request.onsuccess =
          () =>
            resolve(
              request.result ||
              null
            );


        request.onerror =
          () =>
            reject(
              request.error
            );

      }
    );


  db.close();


  return value;

}


/* =========================================================
   حذف ملف
   ========================================================= */

async function wrDeleteFile(
  id
){

  if(!id){

    return;

  }


  const db =
    await wrOpenDB();


  await new Promise(
    (
      resolve,
      reject
    ) => {


      const transaction =
        db.transaction(
          "files",
          "readwrite"
        );


      transaction
        .objectStore(
          "files"
        )
        .delete(
          id
        );


      transaction.oncomplete =
        resolve;


      transaction.onerror =
        () =>
          reject(
            transaction.error
          );

    }
  );


  db.close();

}


/* =========================================================
   Blob إلى DataURL
   ========================================================= */

function wrBlobToDataURL(
  blob
){

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
        () =>
          reject(
            reader.error
          );


      reader.readAsDataURL(
        blob
      );

    }
  );

}


/* =========================================================
   إضافة / تحديث سجل
   ========================================================= */

async function wrAddRecord(
  record,
  files = []
){

  const id =
    record.id ||
    Date.now() +
    Math.random();


  const records =
    wrGetRecords();


  const oldIndex =
    records.findIndex(
      item =>
        String(
          item.id
        ) ===
        String(
          id
        )
    );


  const old =
    oldIndex >= 0
      ? records[
          oldIndex
        ]
      : null;


  const imageRefs =
    [];


  if(
    files.length
  ){

    for(
      const file of files
    ){

      imageRefs.push(

        await wrStoreFile(
          file,
          {
            name:
              file.name,

            type:
              file.type
          }
        )

      );

    }


  }else if(
    old?.imageRefs?.length
  ){

    imageRefs.push(
      ...old.imageRefs
    );

  }


  /*
    نحاول حفظ اسم المستخدم الحقيقي
    بدل اسم محلي قديم.
  */

  let createdByName =
    old?.createdBy ||
    localStorage.getItem(
      "wr_user_name"
    ) ||
    "";


  try{

    const profile =
      await wrGetCurrentProfile();


    if(
      profile?.full_name
    ){

      createdByName =
        profile.full_name;

    }

  }catch{
    /* لا نوقف الحفظ */
  }


  const full = {

    id,

    createdAt:
      record.createdAt ||
      old?.createdAt ||
      new Date()
        .toISOString(),

    updatedAt:
      new Date()
        .toISOString(),

    createdBy:
      createdByName,

    syncStatus:
      "local",

    ...record,

    imageRefs

  };


  if(
    oldIndex >= 0
  ){

    if(
      files.length
    ){

      for(
        const ref of
        old.imageRefs ||
        []
      ){

        if(
          !imageRefs.includes(
            ref
          )
        ){

          await wrDeleteFile(
            ref
          );

        }

      }

    }


    records[
      oldIndex
    ] =
      full;


  }else{


    records.unshift(
      full
    );

  }


  wrSetRecords(
    records
  );


  const queue =
    wrGetQueue()
      .filter(
        item =>
          String(
            item.id
          ) !==
          String(
            id
          )
      );


  queue.push(
    full
  );


  wrSetQueue(
    queue
  );


  wrToast(
    oldIndex >= 0
      ? "تم تحديث التقرير وحفظ الصور"
      : "تم حفظ التقرير والصور في الأرشيف الذكي"
  );


  if(
    navigator.onLine
  ){

    wrSyncPending();

  }


  return full;

}


/* =========================================================
   حذف سجل محلي
   ========================================================= */

async function wrDeleteRecord(
  id
){

  const records =
    wrGetRecords();


  const record =
    records.find(
      item =>
        String(
          item.id
        ) ===
        String(
          id
        )
    );


  for(
    const ref of
    record?.imageRefs ||
    []
  ){

    await wrDeleteFile(
      ref
    );

  }


  wrSetRecords(

    records.filter(
      item =>
        String(
          item.id
        ) !==
        String(
          id
        )
    )

  );


  wrSetQueue(

    wrGetQueue()
      .filter(
        item =>
          String(
            item.id
          ) !==
          String(
            id
          )
      )

  );

}


/* =========================================================
   المزامنة
   ========================================================= */

async function wrSyncPending(){

  if(
    !window.WRGraph
      ?.configured()
  ){

    return {

      synced:
        0,

      pending:
        wrGetQueue()
          .length,

      configured:
        false

    };

  }


  const queue =
    wrGetQueue();


  const remain =
    [];


  let synced =
    0;


  for(
    const record of queue
  ){

    try{


      await WRGraph.uploadJson(
        record
      );


      synced++;


      const all =
        wrGetRecords();


      const index =
        all.findIndex(
          item =>
            String(
              item.id
            ) ===
            String(
              record.id
            )
        );


      if(
        index >= 0
      ){

        all[
          index
        ].syncStatus =
          "synced";


        all[
          index
        ].syncedAt =
          new Date()
            .toISOString();


        wrSetRecords(
          all
        );

      }


    }catch(error){


      record.lastSyncError =
        error.message;


      remain.push(
        record
      );

    }

  }


  wrSetQueue(
    remain
  );


  if(
    synced
  ){

    wrToast(
      `تمت مزامنة ${synced} سجل`
    );

  }


  return {

    synced,

    pending:
      remain.length,

    configured:
      true

  };

}


/* =========================================================
   تنسيق التاريخ
   ========================================================= */

function wrFormatDate(
  value
){

  if(!value){

    return "—";

  }


  return new Date(
    value +
    "T00:00:00"
  )
    .toLocaleDateString(
      "ar-BH",
      {

        day:
          "numeric",

        month:
          "long",

        year:
          "numeric"

      }
    );

}


/* =========================================================
   تنسيق الوقت
   ========================================================= */

function wrFormatTime(
  value
){

  if(!value){

    return "—";

  }


  let [
    hours,
    minutes
  ] =
    value.split(
      ":"
    );


  hours =
    Number(
      hours
    );


  const period =
    hours >= 12
      ? "م"
      : "ص";


  hours =
    hours % 12 ||
    12;


  return (
    `${hours}:${minutes} ${period}`
  );

}


/* =========================================================
   تحويل السطور إلى نقاط
   ========================================================= */

function wrBullets(
  value
){

  const array =
    (
      value ||
      ""
    )
      .split(
        "\n"
      )
      .map(
        item =>
          item.trim()
      )
      .filter(
        Boolean
      );


  return array.length
    ? array
        .map(
          item =>
            "• " +
            item
        )
        .join(
          "\n"
        )
    : "—";

}


/* =========================================================
   Toast
   ========================================================= */

function wrToast(
  message
){

  let element =
    document.getElementById(
      "wrToast"
    );


  if(!element){

    element =
      document.createElement(
        "div"
      );


    element.id =
      "wrToast";


    Object.assign(
      element.style,
      {

        position:
          "fixed",

        left:
          "22px",

        bottom:
          "22px",

        background:
          "#075c40",

        color:
          "#fff",

        padding:
          "13px 18px",

        borderRadius:
          "10px",

        zIndex:
          "9999",

        boxShadow:
          "0 8px 25px rgba(0,0,0,.2)"

      }
    );


    document.body.appendChild(
      element
    );

  }


  element.textContent =
    message;


  element.style.display =
    "block";


  clearTimeout(
    window.__wrToast
  );


  window.__wrToast =
    setTimeout(
      () => {

        element.style.display =
          "none";

      },
      2600
    );

}


/* =========================================================
   اسم آمن للملفات
   ========================================================= */

function wrSafeName(
  value
){

  return (
    value ||
    "تقرير"
  )

    .replace(
      /[\\/:*?"<>|#%]/g,
      "-"
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim()

    .slice(
      0,
      90
    );

}


/* =========================================================
   تنزيل Blob
   ========================================================= */

function wrDownloadBlob(
  blob,
  name
){

  const link =
    document.createElement(
      "a"
    );


  link.href =
    URL.createObjectURL(
      blob
    );


  link.download =
    name;


  document.body.appendChild(
    link
  );


  link.click();


  setTimeout(
    () => {

      URL.revokeObjectURL(
        link.href
      );


      link.remove();

    },
    1200
  );

}


/* =========================================================
   نسخة احتياطية
   ========================================================= */

async function wrExport(){

  const records =
    wrGetRecords();


  const files = {};


  for(
    const record of
    records
  ){

    for(
      const ref of
      record.imageRefs ||
      []
    ){

      const file =
        await wrGetFile(
          ref
        );


      if(
        file
      ){

        files[
          ref
        ] = {

          name:
            file.name,

          type:
            file.type,

          data:
            await wrBlobToDataURL(
              file.blob
            )

        };

      }

    }

  }


  wrDownloadBlob(

    new Blob(
      [
        JSON.stringify(
          {

            version:
              3,

            exportedAt:
              new Date()
                .toISOString(),

            records,

            queue:
              wrGetQueue(),

            files

          },
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    ),

    "WestRiffa-Smart-Office-Backup.json"

  );

}


/* =========================================================
   DataURL إلى Blob
   ========================================================= */

function wrDataURLToBlob(
  dataURL
){

  const [
    head,
    data
  ] =
    dataURL.split(
      ","
    );


  const mime =
    (
      head.match(
        /data:(.*?);/
      ) ||
      []
    )[1] ||
    "application/octet-stream";


  const binary =
    atob(
      data
    );


  const array =
    new Uint8Array(
      binary.length
    );


  for(
    let i = 0;
    i < binary.length;
    i++
  ){

    array[
      i
    ] =
      binary.charCodeAt(
        i
      );

  }


  return new Blob(
    [
      array
    ],
    {
      type:
        mime
    }
  );

}


/* =========================================================
   استيراد النسخة الاحتياطية
   ========================================================= */

function wrImport(
  file,
  callback
){

  const reader =
    new FileReader();


  reader.onload =
    async () => {


      try{


        const data =
          JSON.parse(
            reader.result
          );


        const records =
          Array.isArray(
            data
          )
            ? data
            : data.records;


        if(
          !Array.isArray(
            records
          )
        ){

          throw new Error(
            "ملف النسخة الاحتياطية غير صالح"
          );

        }


        if(
          data.files
        ){

          const db =
            await wrOpenDB();


          await new Promise(
            (
              resolve,
              reject
            ) => {


              const transaction =
                db.transaction(
                  "files",
                  "readwrite"
                );


              const store =
                transaction.objectStore(
                  "files"
                );


              Object.entries(
                data.files
              )
                .forEach(
                  (
                    [
                      id,
                      fileData
                    ]
                  ) => {


                    store.put({

                      id,

                      blob:
                        wrDataURLToBlob(
                          fileData.data
                        ),

                      name:
                        fileData.name,

                      type:
                        fileData.type,

                      createdAt:
                        new Date()
                          .toISOString()

                    });

                  }
                );


              transaction.oncomplete =
                resolve;


              transaction.onerror =
                () =>
                  reject(
                    transaction.error
                  );

            }
          );


          db.close();

        }


        wrSetRecords(
          records
        );


        if(
          Array.isArray(
            data.queue
          )
        ){

          wrSetQueue(
            data.queue
          );

        }


        if(
          callback
        ){

          callback(
            true
          );

        }


      }catch(error){


        console.error(
          error
        );


        if(
          callback
        ){

          callback(
            false
          );

        }

      }

    };


  reader.readAsText(
    file
  );

}


/* =========================================================
   أسماء أنواع السجلات
   ========================================================= */

function wrTypeLabel(
  type
){

  return (

    {

      activity:
        "تقرير فعالية",

      invitation:
        "دعوة",

      meeting:
        "محضر اجتماع",

      attendance:
        "سجل حضور",

      recommendation:
        "متابعة توصية",

      certificate:
        "شهادة",

      classroom_visit:
        "زيارة صفية",

      exchange_visit:
        "زيارة تبادلية",

      permission:
        "استئذان",

      plan:
        "خطة تدفقية"

    }

  )[type] ||
  type;

}


/* =========================================================
   مزامنة عند عودة الإنترنت
   ========================================================= */

window.addEventListener(
  "online",
  () => {

    wrSyncPending();

  }
);


/* =========================================================
   Service Worker
   ========================================================= */

if(
  "serviceWorker" in
  navigator
){

  window.addEventListener(
    "load",
    async () => {


      /*
        أثناء العمل المحلي
        لا نريد Cache قديم.
      */

      if(
        [
          "127.0.0.1",
          "localhost"
        ].includes(
          location.hostname
        )
      ){

        for(
          const registration of
          await navigator
            .serviceWorker
            .getRegistrations()
        ){

          await registration
            .unregister();

        }


        return;

      }


      navigator
        .serviceWorker
        .register(
          (
            location.pathname
              .includes(
                "/pages/"
              )
              ? "../../"
              : ""
          ) +
          "sw.js?v=4"
        )
        .catch(
          () => {}
        );

    }
  );

}


/* =========================================================
   أدوات الصلاحيات متاحة للصفحات
   ========================================================= */

/*
  يمكن استخدام هذه الدوال مباشرة
  من أي صفحة لأن function declarations
  موجودة في النطاق العام:

  wrGetCurrentProfile()

  wrIsAdmin()

  wrIsCoordinator()

  wrIsTeacher()

  wrIsLeadership()

  wrLeadershipLevel()

  wrHasRole(["admin","coordinator"])

  wrCan("view_admin_indicators")

  wrGetAccessScope()

  wrGetDepartmentIds()

  wrGetDepartmentNames()

  wrRequireAdmin()

  wrRequireLeadership()

  wrRequireRoles(["admin"])

  wrRequireRoles(["admin","coordinator"])
*/


/* =========================================================
   API إضافي اختياري
   ========================================================= */

window.WRAccess = {

  getProfile:
    wrGetCurrentProfile,

  clearCache:
    wrClearProfileCache,

  normalizeRole:
    wrNormalizeRole,

  roleLabel:
    wrRoleLabel,

  isAdmin:
    wrIsAdmin,

  isCoordinator:
    wrIsCoordinator,

  isTeacher:
    wrIsTeacher,

  isLeadership:
    wrIsLeadership,

  leadershipLevel:
    wrLeadershipLevel,

  hasRole:
    wrHasRole,

  can:
    wrCan,

  getScope:
    wrGetAccessScope,

  getDepartmentIds:
    wrGetDepartmentIds,

  getDepartmentNames:
    wrGetDepartmentNames,

  requireRoles:
    wrRequireRoles,

  requireAdmin:
    wrRequireAdmin,

  requireLeadership:
    wrRequireLeadership,

  applyRoleVisibility:
    wrApplyRoleVisibility

};