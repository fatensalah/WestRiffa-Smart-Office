(function () {
  let supabaseClient = null;

  const STORAGE_BUCKET = "wrso-files";

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
    if (supabaseClient) return supabaseClient;

    if (!configured()) {
      throw new Error("Supabase غير مُعد بعد");
    }

    if (!window.supabase) {
      throw new Error("مكتبة Supabase غير محملة");
    }

    supabaseClient = window.supabase.createClient(
      cfg().supabaseUrl,
      cfg().supabaseKey
    );

    return supabaseClient;
  }

  async function init() {
    if (!configured() || !window.supabase) return false;

    try {
      client();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function login(email, password) {
    const sb = client();

    if (!email || !password) {
      throw new Error("أدخلي البريد الإلكتروني وكلمة المرور");
    }

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return data;
  }

  async function logout() {
    const sb = client();

    const { error } = await sb.auth.signOut();

    if (error) throw error;

    return true;
  }

  async function getAccount() {
    const sb = client();

    const { data, error } = await sb.auth.getUser();

    if (error) return null;

    return data?.user || null;
  }

  function safeFileName(name) {
    return String(name || "image")
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_");
  }

  async function uploadFiles(recordId, files = []) {
    const sb = client();

    const { data: userData, error: userError } =
      await sb.auth.getUser();

    if (userError || !userData?.user) {
      throw new Error("لا يوجد مستخدم مسجل الدخول");
    }

    const selected = [...files].slice(0, 10);
    const uploadedPaths = [];

    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];

      const fileName =
        Date.now() +
        "_" +
        i +
        "_" +
        safeFileName(file.name);

      const path =
        `activities/${String(recordId)}/${fileName}`;

      const { error } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined
        });

      if (error) throw error;

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function getFileUrl(path) {
    if (!path) return "";

    const sb = client();

    const { data, error } = await sb.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (error) throw error;

    return data?.signedUrl || "";
  }

  async function deleteFiles(paths = []) {
    if (!Array.isArray(paths) || !paths.length) {
      return true;
    }

    const sb = client();

    const { error } = await sb.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (error) throw error;

    return true;
  }

  async function uploadJson(record) {
    const sb = client();

    if (!record) {
      throw new Error("لا توجد بيانات للحفظ");
    }

    const id =
      record.id ||
      (
        "rec_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2, 8)
      );

    const type = record.type || "record";

    const title =
      record.title ||
      record.name ||
      type;

    const rawDate =
      record.record_date ||
      record.recordDate ||
      record.date ||
      record.createdAt ||
      new Date().toISOString();

    let recordDate;

    try {
      recordDate =
        new Date(rawDate)
          .toISOString()
          .slice(0, 10);
    } catch (e) {
      recordDate =
        new Date()
          .toISOString()
          .slice(0, 10);
    }

    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if (userError || !user) {
      throw new Error("لا يوجد مستخدم مسجل الدخول");
    }

    const imagePaths =
      Array.isArray(record.image_paths)
        ? record.image_paths
        : Array.isArray(record.imagePaths)
          ? record.imagePaths
          : [];

    const payload = {
      ...record,
      image_paths: imagePaths
    };

    const row = {
      id: String(id),
      type: String(type),
      title: String(title),
      record_date: recordDate,
      payload,
      image_paths: imagePaths,
      created_by: user.id
    };

    const { data, error } = await sb
      .from("records")
      .upsert(row, {
        onConflict: "id"
      })
      .select();

    if (error) throw error;

    return data;
  }

  async function fetchRecords() {
    const sb = client();

    const { data, error } = await sb
      .from("records")
      .select("*")
      .order("record_date", {
        ascending: false
      });

    if (error) throw error;

    return data || [];
  }

  // حذف السجل من Supabase
  async function deleteRecord(id) {
    if (!id) {
      throw new Error("معرّف السجل غير موجود");
    }

    const sb = client();

    const {
      data: { user },
      error: userError
    } = await sb.auth.getUser();

    if (userError || !user) {
      throw new Error("لا يوجد مستخدم مسجل الدخول");
    }

    const { data, error } = await sb
      .from("records")
      .delete()
      .eq("id", String(id))
      .select("id");

    if (error) throw error;

    return data || [];
  }

  async function test() {
    try {
      if (!configured()) {
        return {
          ok: false,
          message: "إعدادات Supabase غير مكتملة"
        };
      }

      const sb = client();

      const { data: sessionData } =
        await sb.auth.getSession();

      if (!sessionData?.session) {
        return {
          ok: false,
          needsLogin: true,
          message: "الاتصال جاهز — يلزم تسجيل الدخول"
        };
      }

      const { error } = await sb
        .from("records")
        .select("id")
        .limit(1);

      if (error) throw error;

      return {
        ok: true,
        message: "تم الاتصال بـ Supabase بنجاح"
      };

    } catch (e) {
      console.error(e);

      return {
        ok: false,
        message: e.message || "فشل الاتصال"
      };
    }
  }

  window.WRGraph = {
    configured,
    init,
    login,
    logout,
    uploadJson,
    fetchRecords,
    deleteRecord,
    uploadFiles,
    getFileUrl,
    deleteFiles,
    test,
    getAccount
  };
})();