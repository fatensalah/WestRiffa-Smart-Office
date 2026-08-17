(function () {
  "use strict";

  let supabaseClient = null;

  const STORAGE_BUCKET =
    "wrso-files";

  const SETTINGS_CACHE_TIME =
    5 * 60 * 1000;

  const settingsCache =
    new Map();


  /* =========================================================
     الإعدادات الأساسية
     ========================================================= */

  function cfg() {
    return window.WR_CONFIG || {};
  }


  function configured() {
    const c = cfg();

    return !!(
      c.supabaseUrl &&
      c.supabaseKey &&
      !c.supabaseUrl.includes("PUT_") &&
      !c.supabaseKey.includes("PUT_")
    );
  }


  function client() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!configured()) {
      throw new Error(
        "Supabase غير مُعد بعد"
      );
    }

    if (!window.supabase) {
      throw new Error(
        "مكتبة Supabase غير محملة"
      );
    }

    supabaseClient =
      window.supabase.createClient(
        cfg().supabaseUrl,
        cfg().supabaseKey
      );

    return supabaseClient;
  }


  async function init() {
    if (
      !configured() ||
      !window.supabase
    ) {
      return false;
    }

    try {
      client();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }


  /* =========================================================
     تسجيل الدخول
     ========================================================= */

  async function login(
    email,
    password
  ) {
    const sb = client();

    if (
      !email ||
      !password
    ) {
      throw new Error(
        "أدخلي البريد الإلكتروني وكلمة المرور"
      );
    }

    const {
      data,
      error
    } =
      await sb.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      throw error;
    }

    return data;
  }


  async function logout() {
    const sb = client();

    const {
      error
    } =
      await sb.auth
        .signOut();

    if (error) {
      throw error;
    }

    return true;
  }


  async function getAccount() {
    const sb = client();

    const {
      data,
      error
    } =
      await sb.auth
        .getUser();

    if (
      error ||
      !data?.user
    ) {
      return null;
    }

    return data.user;
  }


  /* =========================================================
     الأدوار
     ========================================================= */

  function normalizeRole(
    role
  ) {
    const value =
      String(
        role ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      [
        "admin",
        "coordinator",
        "teacher"
      ].includes(value)
    ) {
      return value;
    }

    return null;
  }


  function roleLabel(
    role
  ) {
    const value =
      normalizeRole(role);

    if (
      value ===
      "admin"
    ) {
      return "القيادة العليا";
    }

    if (
      value ===
      "coordinator"
    ) {
      return "القيادة الوسطى";
    }

    if (
      value ===
      "teacher"
    ) {
      return "معلمة";
    }

    return "مستخدم";
  }


  /* =========================================================
     بيانات المستخدم
     ========================================================= */

  async function getUserProfile() {
    const sb =
      client();

    const {
      data: userData,
      error: userError
    } =
      await sb.auth
        .getUser();

    if (
      userError ||
      !userData?.user
    ) {
      return null;
    }

    const user =
      userData.user;


    const {
      data: userProfile,
      error: userProfileError
    } =
      await sb
        .from(
          "user_profiles"
        )
        .select(
          "user_id, full_name, role, department_id"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();


    if (
      userProfileError
    ) {
      console.warn(
        "تعذر قراءة user_profiles:",
        userProfileError
      );
    }


    let legacyProfile =
      null;


    if (!userProfile) {
      const {
        data,
        error
      } =
        await sb
          .from(
            "profiles"
          )
          .select(
            "id, full_name, role"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (error) {
        console.warn(
          "تعذر قراءة profiles:",
          error
        );
      }

      legacyProfile =
        data ||
        null;
    }


    const role =
      normalizeRole(
        userProfile?.role ||
        legacyProfile?.role ||
        null
      );


    const fullName =
      userProfile?.full_name ||
      legacyProfile?.full_name ||
      user.email ||
      "";


    let departmentAssignments =
      [];


    const {
      data: assignments,
      error: assignmentsError
    } =
      await sb
        .from(
          "profile_departments"
        )
        .select(
          "profile_id, department_id, assignment_type"
        )
        .eq(
          "profile_id",
          user.id
        );


    if (
      assignmentsError
    ) {
      console.warn(
        "تعذر قراءة profile_departments:",
        assignmentsError
      );
    } else {
      departmentAssignments =
        assignments ||
        [];
    }


    if (
      !departmentAssignments.length &&
      userProfile?.department_id
    ) {
      departmentAssignments.push({
        profile_id:
          user.id,

        department_id:
          userProfile.department_id,

        assignment_type:
          role ===
          "coordinator"
            ? "coordinator"
            : "teacher"
      });
    }


    const departmentIds = [
      ...new Set(
        departmentAssignments
          .map(
            item =>
              String(
                item.department_id ||
                ""
              )
          )
          .filter(Boolean)
      )
    ];


    let departments =
      [];


    if (
      departmentIds.length
    ) {
      const {
        data,
        error
      } =
        await sb
          .from(
            "departments"
          )
          .select(
            "id, name"
          )
          .in(
            "id",
            departmentIds
          )
          .order(
            "name"
          );


      if (error) {
        console.warn(
          "تعذر قراءة أسماء الأقسام:",
          error
        );
      } else {
        departments =
          data ||
          [];
      }
    }


    const departmentNames =
      departments.map(
        item =>
          item.name
      );


    const permissions = {
      full_access:
        role ===
        "admin",

      all_departments:
        role ===
        "admin",

      view_all_records:
        role ===
        "admin",

      manage_settings:
        role ===
        "admin",

      view_admin_indicators:
        role ===
        "admin",

      manage_users:
        role ===
        "admin",

      delete_any_record:
        role ===
        "admin",

      edit_any_record:
        role ===
        "admin",

      department_scope:
        role ===
        "coordinator",

      view_department_records:
        role ===
        "coordinator",

      classroom_visits:
        role ===
          "admin" ||
        role ===
          "coordinator",

      leadership_level:
        role ===
        "admin"
          ? "قيادة عليا"
          : role ===
            "coordinator"
              ? "قيادة وسطى"
              : null,

      create_own_records:
        Boolean(role),

      view_own_records:
        Boolean(role)
    };


    return {
      user_id:
        user.id,

      id:
        user.id,

      email:
        user.email ||
        "",

      full_name:
        fullName,

      role,

      role_label:
        roleLabel(role),

      department_id:
        departmentIds[0] ||
        null,

      department_name:
        departmentNames[0] ||
        null,

      department_ids:
        departmentIds,

      department_names:
        departmentNames,

      departments,

      department_assignments:
        departmentAssignments,

      permissions
    };
  }


  async function isAdmin() {
    return (
      await getUserProfile()
    )?.role ===
      "admin";
  }


  async function isCoordinator() {
    return (
      await getUserProfile()
    )?.role ===
      "coordinator";
  }


  async function isTeacher() {
    return (
      await getUserProfile()
    )?.role ===
      "teacher";
  }


  async function hasRole(
    roles
  ) {
    const profile =
      await getUserProfile();

    const allowed =
      (
        Array.isArray(
          roles
        )
          ? roles
          : [roles]
      )
        .map(
          normalizeRole
        )
        .filter(
          Boolean
        );

    return allowed.includes(
      profile?.role
    );
  }


  async function isLeadership() {
    const profile =
      await getUserProfile();

    return [
      "admin",
      "coordinator"
    ].includes(
      profile?.role
    );
  }


  async function getLeadershipLevel() {
    return (
      await getUserProfile()
    )?.permissions
      ?.leadership_level ||
      null;
  }


  async function hasFullAccess() {
    return Boolean(
      (
        await getUserProfile()
      )?.permissions
        ?.full_access
    );
  }


  async function can(
    permission
  ) {
    const profile =
      await getUserProfile();

    if (!profile) {
      return false;
    }

    if (
      profile.role ===
      "admin"
    ) {
      return true;
    }

    return Boolean(
      profile.permissions?.[
        permission
      ]
    );
  }


  async function getAccessScope() {
    const profile =
      await getUserProfile();

    if (!profile) {
      return {
        type:
          "none",

        department_ids:
          [],

        department_names:
          []
      };
    }


    if (
      profile.role ===
      "admin"
    ) {
      return {
        type:
          "all",

        department_ids:
          [],

        department_names:
          []
      };
    }


    if (
      profile.role ===
      "coordinator"
    ) {
      return {
        type:
          "departments",

        department_ids:
          profile.department_ids ||
          [],

        department_names:
          profile.department_names ||
          []
      };
    }


    return {
      type:
        "self",

      department_ids:
        profile.department_ids ||
        [],

      department_names:
        profile.department_names ||
        []
    };
  }


  async function getDepartmentId() {
    return (
      await getUserProfile()
    )?.department_id ||
      null;
  }


  async function getDepartmentName() {
    return (
      await getUserProfile()
    )?.department_name ||
      null;
  }


  async function getDepartmentIds() {
    return (
      await getUserProfile()
    )?.department_ids ||
      [];
  }


  async function getDepartmentNames() {
    return (
      await getUserProfile()
    )?.department_names ||
      [];
  }


  /* =========================================================
     إعدادات المنصة
     ========================================================= */

  async function getAppSetting(
    key,
    fallbackValue = null,
    options = {}
  ) {
    const settingKey =
      String(
        key ||
        ""
      ).trim();


    if (!settingKey) {
      return fallbackValue;
    }


    const forceRefresh =
      Boolean(
        options.forceRefresh
      );


    const cached =
      settingsCache.get(
        settingKey
      );


    if (
      !forceRefresh &&
      cached &&
      (
        Date.now() -
        cached.loadedAt
      ) <
      SETTINGS_CACHE_TIME
    ) {
      return cached.value;
    }


    try {
      const sb =
        client();


      const {
        data,
        error
      } =
        await sb
          .from(
            "app_settings"
          )
          .select(
            "setting_value"
          )
          .eq(
            "setting_key",
            settingKey
          )
          .maybeSingle();


      if (error) {
        console.warn(
          `تعذر قراءة إعداد ${settingKey}:`,
          error
        );

        return fallbackValue;
      }


      const value =
        data?.setting_value ??
        fallbackValue;


      settingsCache.set(
        settingKey,
        {
          value,
          loadedAt:
            Date.now()
        }
      );


      return value;

    } catch (error) {
      console.warn(
        `تعذر قراءة إعداد ${settingKey}:`,
        error
      );

      return fallbackValue;
    }
  }


  async function getActiveSchoolYear(
    forceRefresh = false
  ) {
    const value =
      await getAppSetting(
        "active_school_year",
        "",
        {
          forceRefresh
        }
      );


    const normalized =
      String(
        value ||
        ""
      ).trim();


    if (normalized) {
      return normalized;
    }


    /*
      احتياط فقط إذا تعذر قراءة Supabase.
      نحسب السنة الدراسية من التاريخ الحالي.
      من أغسطس تبدأ سنة دراسية جديدة.
    */

    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =
      now.getMonth() + 1;


    if (
      month >= 8
    ) {
      return (
        `${year}/${year + 1}`
      );
    }


    return (
      `${year - 1}/${year}`
    );
  }


  function clearSettingsCache(
    key = null
  ) {
    if (key) {
      settingsCache.delete(
        String(key)
      );

      return;
    }

    settingsCache.clear();
  }


  /* =========================================================
     أسماء الملفات
     ========================================================= */

  function safeFileName(
    name
  ) {
    return String(
      name ||
      "file"
    )
      .replace(
        /[^\w.-]+/g,
        "_"
      )
      .replace(
        /_+/g,
        "_"
      );
  }


  /* =========================================================
     حماية التخزين وضغط الصور
     ========================================================= */

  const IMAGE_MAX_DIMENSION =
    1600;

  const IMAGE_TARGET_BYTES =
    900 * 1024;

  const IMAGE_MAX_OUTPUT_BYTES =
    2 * 1024 * 1024;

  const IMAGE_MAX_INPUT_BYTES =
    20 * 1024 * 1024;

  const PDF_MAX_BYTES =
    10 * 1024 * 1024;

  const IMAGE_INITIAL_QUALITY =
    0.82;

  const IMAGE_MIN_QUALITY =
    0.55;


  function isImageFile(
    file
  ) {
    return Boolean(
      file &&
      String(
        file.type ||
        ""
      ).startsWith(
        "image/"
      )
    );
  }


  function isPdfFile(
    file
  ) {
    return Boolean(
      file &&
      String(
        file.type ||
        ""
      )
        .toLowerCase() ===
        "application/pdf"
    );
  }


  function bytesLabel(
    bytes
  ) {
    const value =
      Number(
        bytes ||
        0
      );


    if (
      value < 1024
    ) {
      return `${value} B`;
    }


    if (
      value <
      1024 * 1024
    ) {
      return `${(
        value /
        1024
      ).toFixed(
        1
      )} KB`;
    }


    return `${(
      value /
      (
        1024 *
        1024
      )
    ).toFixed(
      2
    )} MB`;
  }


  function replaceExtension(
    name,
    extension
  ) {
    const safe =
      safeFileName(
        name ||
        "image"
      );


    return (
      safe.replace(
        /\.[^.]+$/,
        ""
      ) +
      extension
    );
  }


  function canvasToBlob(
    canvas,
    type,
    quality
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {

        canvas.toBlob(
          blob => {

            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  "تعذر تجهيز الصورة للرفع"
                )
              );
            }

          },

          type,
          quality
        );

      }
    );
  }


  async function loadImageSource(
    file
  ) {
    if (
      typeof createImageBitmap ===
      "function"
    ) {
      const bitmap =
        await createImageBitmap(
          file
        );


      return {
        source:
          bitmap,

        width:
          bitmap.width,

        height:
          bitmap.height,

        close: () => {
          try {
            bitmap.close();
          } catch (_) {}
        }
      };
    }


    const objectUrl =
      URL.createObjectURL(
        file
      );


    try {
      const image =
        await new Promise(
          (
            resolve,
            reject
          ) => {

            const img =
              new Image();


            img.onload =
              () =>
                resolve(
                  img
                );


            img.onerror =
              () =>
                reject(
                  new Error(
                    "تعذر قراءة الصورة"
                  )
                );


            img.src =
              objectUrl;

          }
        );


      return {
        source:
          image,

        width:
          image.naturalWidth ||
          image.width,

        height:
          image.naturalHeight ||
          image.height,

        close: () =>
          URL.revokeObjectURL(
            objectUrl
          )
      };

    } catch (error) {
      URL.revokeObjectURL(
        objectUrl
      );

      throw error;
    }
  }


  function scaledDimensions(
    width,
    height,
    maxDimension
  ) {
    const safeWidth =
      Math.max(
        1,
        Number(
          width ||
          1
        )
      );


    const safeHeight =
      Math.max(
        1,
        Number(
          height ||
          1
        )
      );


    const longest =
      Math.max(
        safeWidth,
        safeHeight
      );


    if (
      longest <=
      maxDimension
    ) {
      return {
        width:
          Math.round(
            safeWidth
          ),

        height:
          Math.round(
            safeHeight
          )
      };
    }


    const ratio =
      maxDimension /
      longest;


    return {
      width:
        Math.max(
          1,
          Math.round(
            safeWidth *
            ratio
          )
        ),

      height:
        Math.max(
          1,
          Math.round(
            safeHeight *
            ratio
          )
        )
    };
  }


  async function compressImageFile(
    file
  ) {
    if (
      !isImageFile(
        file
      )
    ) {
      return file;
    }


    if (
      file.size >
      IMAGE_MAX_INPUT_BYTES
    ) {
      throw new Error(
        `الصورة ${file.name || ""} كبيرة جدًا. الحد الأقصى للصورة الأصلية قبل الضغط هو 20 MB.`
      );
    }


    const loaded =
      await loadImageSource(
        file
      );


    try {
      let maxDimension =
        IMAGE_MAX_DIMENSION;


      let dimensions =
        scaledDimensions(
          loaded.width,
          loaded.height,
          maxDimension
        );


      let bestBlob =
        null;


      for (
        let dimensionPass = 0;
        dimensionPass < 3;
        dimensionPass++
      ) {
        const canvas =
          document.createElement(
            "canvas"
          );


        canvas.width =
          dimensions.width;


        canvas.height =
          dimensions.height;


        const context =
          canvas.getContext(
            "2d",
            {
              alpha:
                true
            }
          );


        if (!context) {
          throw new Error(
            "المتصفح لا يدعم معالجة الصور المطلوبة"
          );
        }


        context.imageSmoothingEnabled =
          true;


        context.imageSmoothingQuality =
          "high";


        context.drawImage(
          loaded.source,
          0,
          0,
          dimensions.width,
          dimensions.height
        );


        for (
          let quality =
            IMAGE_INITIAL_QUALITY;

          quality >=
            IMAGE_MIN_QUALITY;

          quality -=
            0.07
        ) {
          const blob =
            await canvasToBlob(
              canvas,
              "image/webp",
              Number(
                quality.toFixed(
                  2
                )
              )
            );


          if (
            !bestBlob ||
            blob.size <
            bestBlob.size
          ) {
            bestBlob =
              blob;
          }


          if (
            blob.size <=
            IMAGE_TARGET_BYTES
          ) {
            bestBlob =
              blob;

            break;
          }
        }


        if (
          bestBlob &&
          bestBlob.size <=
            IMAGE_TARGET_BYTES
        ) {
          break;
        }


        maxDimension =
          Math.max(
            1000,
            Math.round(
              maxDimension *
              0.82
            )
          );


        dimensions =
          scaledDimensions(
            loaded.width,
            loaded.height,
            maxDimension
          );
      }


      if (!bestBlob) {
        return file;
      }


      if (
        bestBlob.size >
        IMAGE_MAX_OUTPUT_BYTES
      ) {
        throw new Error(
          `تعذر ضغط الصورة ${file.name || ""} إلى حجم آمن. جرّبي صورة أصغر.`
        );
      }


      const outputName =
        replaceExtension(
          file.name,
          ".webp"
        );


      const compressed =
        new File(
          [bestBlob],
          outputName,
          {
            type:
              "image/webp",

            lastModified:
              Date.now()
          }
        );


      console.info(
        `[WR Storage] ${file.name || "image"}: ${bytesLabel(file.size)} → ${bytesLabel(compressed.size)}`
      );


      return compressed;

    } finally {
      loaded.close();
    }
  }


  async function prepareFileForUpload(
    file
  ) {
    if (!file) {
      throw new Error(
        "ملف غير صالح"
      );
    }


    if (
      isImageFile(
        file
      )
    ) {
      return await compressImageFile(
        file
      );
    }


    if (
      isPdfFile(
        file
      )
    ) {
      if (
        file.size >
        PDF_MAX_BYTES
      ) {
        throw new Error(
          `ملف PDF ${file.name || ""} أكبر من 10 MB.`
        );
      }


      return file;
    }


    throw new Error(
      `نوع الملف ${file.name || ""} غير مسموح. استخدمي صورة أو PDF فقط.`
    );
  }


  /* =========================================================
     رفع الملفات
     ========================================================= */

  async function uploadFiles(
    recordId,
    files = []
  ) {
    const sb =
      client();


    const {
      data: userData,
      error: userError
    } =
      await sb.auth
        .getUser();


    if (
      userError ||
      !userData?.user
    ) {
      throw new Error(
        "لا يوجد مستخدم مسجل الدخول"
      );
    }


    const selected =
      [
        ...files
      ]
        .slice(
          0,
          10
        );


    const uploadedPaths =
      [];


    for (
      let i = 0;
      i <
      selected.length;
      i++
    ) {
      const originalFile =
        selected[i];


      const file =
        await prepareFileForUpload(
          originalFile
        );


      const fileName =
        Date.now() +
        "_" +
        i +
        "_" +
        safeFileName(
          file.name
        );


      const path =
        `activities/${String(
          recordId
        )}/${fileName}`;


      const {
        error
      } =
        await sb.storage
          .from(
            STORAGE_BUCKET
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                file.type ||
                undefined
            }
          );


      if (error) {
        throw error;
      }


      uploadedPaths.push(
        path
      );
    }


    return uploadedPaths;
  }


  /* =========================================================
     رابط الملف
     ========================================================= */

  async function getFileUrl(
    path
  ) {
    if (!path) {
      return "";
    }


    const sb =
      client();


    const {
      data,
      error
    } =
      await sb.storage
        .from(
          STORAGE_BUCKET
        )
        .createSignedUrl(
          path,
          60 * 60
        );


    if (error) {
      throw error;
    }


    return (
      data?.signedUrl ||
      ""
    );
  }


  /* =========================================================
     حذف الملفات
     ========================================================= */

  async function deleteFiles(
    paths = []
  ) {
    if (
      !Array.isArray(
        paths
      ) ||
      !paths.length
    ) {
      return true;
    }


    const sb =
      client();


    const {
      error
    } =
      await sb.storage
        .from(
          STORAGE_BUCKET
        )
        .remove(
          paths
        );


    if (error) {
      throw error;
    }


    return true;
  }


  /* =========================================================
     حفظ سجل عام
     ========================================================= */

  async function uploadJson(
    record
  ) {
    const sb =
      client();


    if (!record) {
      throw new Error(
        "لا توجد بيانات للحفظ"
      );
    }


    const id =
      record.id ||
      (
        "rec_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(
            36
          )
          .slice(
            2,
            8
          )
      );


    const type =
      record.type ||
      "record";


    const title =
      record.title ||
      record.name ||
      type;


    const rawDate =
      record.record_date ||
      record.recordDate ||
      record.date ||
      record.createdAt ||
      new Date()
        .toISOString();


    let recordDate;


    try {
      recordDate =
        new Date(
          rawDate
        )
          .toISOString()
          .slice(
            0,
            10
          );

    } catch (_) {
      recordDate =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );
    }


    const {
      data: userData,
      error: userError
    } =
      await sb.auth
        .getUser();


    const user =
      userData?.user;


    if (
      userError ||
      !user
    ) {
      throw new Error(
        "لا يوجد مستخدم مسجل الدخول"
      );
    }


    const imagePaths =
      Array.isArray(
        record.image_paths
      )
        ? record.image_paths
        : Array.isArray(
            record.imagePaths
          )
          ? record.imagePaths
          : [];


    const payload = {
      ...record,

      image_paths:
        imagePaths
    };


    const row = {
      id:
        String(id),

      type:
        String(type),

      title:
        String(title),

      record_date:
        recordDate,

      payload,

      image_paths:
        imagePaths,

      created_by:
        user.id
    };


    const {
      data,
      error
    } =
      await sb
        .from(
          "records"
        )
        .upsert(
          row,
          {
            onConflict:
              "id"
          }
        )
        .select();


    if (error) {
      throw error;
    }


    return data;
  }


  /* =========================================================
     قراءة السجلات
     ========================================================= */

  async function fetchRecords() {
    const sb =
      client();


    const {
      data,
      error
    } =
      await sb
        .from(
          "records"
        )
        .select("*")
        .order(
          "record_date",
          {
            ascending:
              false
          }
        );


    if (error) {
      throw error;
    }


    return (
      data ||
      []
    );
  }


  /* =========================================================
     حذف السجل
     ========================================================= */

  async function deleteRecord(
    id
  ) {
    if (!id) {
      throw new Error(
        "معرّف السجل غير موجود"
      );
    }


    const sb =
      client();


    const {
      data: userData,
      error: userError
    } =
      await sb.auth
        .getUser();


    if (
      userError ||
      !userData?.user
    ) {
      throw new Error(
        "لا يوجد مستخدم مسجل الدخول"
      );
    }


    const {
      data,
      error
    } =
      await sb
        .from(
          "records"
        )
        .delete()
        .eq(
          "id",
          String(id)
        )
        .select(
          "id"
        );


    if (error) {
      throw error;
    }


    return (
      data ||
      []
    );
  }


  /* =========================================================
     اختبار الاتصال
     ========================================================= */

  async function test() {
    try {

      if (!configured()) {
        return {
          ok:
            false,

          message:
            "إعدادات Supabase غير مكتملة"
        };
      }


      const sb =
        client();


      const {
        data: sessionData
      } =
        await sb.auth
          .getSession();


      if (
        !sessionData?.session
      ) {
        return {
          ok:
            false,

          needsLogin:
            true,

          message:
            "الاتصال جاهز — يلزم تسجيل الدخول"
        };
      }


      const {
        error
      } =
        await sb
          .from(
            "records"
          )
          .select(
            "id"
          )
          .limit(
            1
          );


      if (error) {
        throw error;
      }


      return {
        ok:
          true,

        message:
          "تم الاتصال بـ Supabase بنجاح"
      };

    } catch (error) {
      console.error(
        error
      );


      return {
        ok:
          false,

        message:
          error.message ||
          "فشل الاتصال"
      };
    }
  }


  /* =========================================================
     API عام للمنصة
     ========================================================= */

  window.WRGraph = {
    configured,

    init,

    login,

    logout,

    getAccount,

    getUserProfile,

    normalizeRole,

    roleLabel,

    isAdmin,

    isCoordinator,

    isTeacher,

    hasRole,

    isLeadership,

    getLeadershipLevel,

    hasFullAccess,

    can,

    getAccessScope,

    getDepartmentId,

    getDepartmentName,

    getDepartmentIds,

    getDepartmentNames,

    /*
      إعدادات المنصة
    */

    getAppSetting,

    getActiveSchoolYear,

    clearSettingsCache,

    /*
      السجلات والملفات
    */

    uploadJson,

    fetchRecords,

    deleteRecord,

    uploadFiles,

    getFileUrl,

    deleteFiles,

    test
  };

})();