const WR_KEY = "westriffa_full_records_v3";
const WR_QUEUE_KEY = "westriffa_sync_queue_v3";
const WR_DB_NAME = "WestRiffaSmartOffice";
const WR_DB_VERSION = 2;

const $ = (id) => document.getElementById(id);


/* =========================================================
   Supabase
   ========================================================= */

const wrSupabase = window.supabase.createClient(
  window.WR_CONFIG.supabaseUrl,
  window.WR_CONFIG.supabaseKey
);

console.log("Supabase connected:", wrSupabase);


/* =========================================================
   حماية صفحات المنصة الداخلية
   ========================================================= */

async function wrProtectPage() {

  /*
    الصفحة الرئيسية index.html هي صفحة تسجيل الدخول،
    لذلك لا نعيد توجيهها.
  */

  const path = window.location.pathname.toLowerCase();

  const isHomePage =
    path.endsWith("/index.html") &&
    !path.includes("/pages/");

  const isRoot =
    path === "/" ||
    !path.includes("/pages/");


  if (isHomePage || isRoot) {
    return true;
  }


  /*
    نخفي الصفحة أثناء التحقق حتى لا يظهر
    المحتوى للحظة قبل التأكد من تسجيل الدخول.
  */

  document.documentElement.style.visibility = "hidden";


  try {

    if (
      !window.WRGraph ||
      typeof WRGraph.getAccount !== "function"
    ) {

      throw new Error(
        "نظام تسجيل الدخول غير متاح"
      );

    }


    const user =
      await WRGraph.getAccount();


    if (!user) {

      /*
        أي صفحة داخل pages تكون على هذا العمق:
        pages/section/file.html

        لذلك ../../index.html يرجع للرئيسية.
      */

      window.location.replace(
        "../../index.html"
      );

      return false;
    }


    document.documentElement.style.visibility =
      "visible";


    return true;


  } catch (error) {

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


/*
  تشغيل الحماية تلقائيًا للصفحات الداخلية.
*/

if (
  window.location.pathname.includes("/pages/")
) {

  wrProtectPage();

}


/* =========================================================
   Local Storage
   ========================================================= */

function wrGetRecords() {

  try {

    return JSON.parse(
      localStorage.getItem(WR_KEY)
    ) || [];

  } catch {

    return [];

  }

}


function wrSetRecords(records) {

  localStorage.setItem(
    WR_KEY,
    JSON.stringify(records)
  );

  window.dispatchEvent(
    new Event("wr-records-changed")
  );

}


function wrGetQueue() {

  try {

    return JSON.parse(
      localStorage.getItem(
        WR_QUEUE_KEY
      )
    ) || [];

  } catch {

    return [];

  }

}


function wrSetQueue(q) {

  localStorage.setItem(
    WR_QUEUE_KEY,
    JSON.stringify(q)
  );

  window.dispatchEvent(
    new Event("wr-sync-changed")
  );

}


/* =========================================================
   IndexedDB
   ========================================================= */

function wrOpenDB() {

  return new Promise(
    (resolve, reject) => {

      const req =
        indexedDB.open(
          WR_DB_NAME,
          WR_DB_VERSION
        );


      req.onupgradeneeded =
        () => {

          const db =
            req.result;


          if (
            db.objectStoreNames.contains(
              "files"
            )
          ) {

            const tx =
              req.transaction;

            const store =
              tx.objectStore(
                "files"
              );


            if (
              store.keyPath !== "id"
            ) {

              db.deleteObjectStore(
                "files"
              );

              db.createObjectStore(
                "files",
                {
                  keyPath: "id"
                }
              );

            }

          } else {

            db.createObjectStore(
              "files",
              {
                keyPath: "id"
              }
            );

          }

        };


      req.onsuccess =
        () => resolve(
          req.result
        );


      req.onerror =
        () => reject(
          req.error
        );

    }
  );

}


/* =========================================================
   حفظ الملفات
   ========================================================= */

async function wrStoreFile(
  blob,
  meta = {}
) {

  const db =
    await wrOpenDB();


  const id =
    `file_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;


  await new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          "files",
          "readwrite"
        );


      const store =
        tx.objectStore(
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
        () => reject(
          request.error
        );


      tx.oncomplete =
        resolve;


      tx.onerror =
        () => reject(
          tx.error ||
          request.error
        );


      tx.onabort =
        () => reject(
          tx.error ||
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

async function wrGetFile(id) {

  if (!id) {
    return null;
  }


  const db =
    await wrOpenDB();


  const value =
    await new Promise(
      (resolve, reject) => {

        const req =
          db
            .transaction(
              "files",
              "readonly"
            )
            .objectStore(
              "files"
            )
            .get(id);


        req.onsuccess =
          () => resolve(
            req.result ||
            null
          );


        req.onerror =
          () => reject(
            req.error
          );

      }
    );


  db.close();

  return value;

}


/* =========================================================
   حذف ملف
   ========================================================= */

async function wrDeleteFile(id) {

  if (!id) {
    return;
  }


  const db =
    await wrOpenDB();


  await new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          "files",
          "readwrite"
        );


      tx
        .objectStore(
          "files"
        )
        .delete(id);


      tx.oncomplete =
        resolve;


      tx.onerror =
        () => reject(
          tx.error
        );

    }
  );


  db.close();

}


/* =========================================================
   Blob إلى DataURL
   ========================================================= */

function wrBlobToDataURL(blob) {

  return new Promise(
    (resolve, reject) => {

      const r =
        new FileReader();


      r.onload =
        () => resolve(
          r.result
        );


      r.onerror =
        () => reject(
          r.error
        );


      r.readAsDataURL(
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
) {

  const id =
    record.id ||
    Date.now() +
    Math.random();


  const records =
    wrGetRecords();


  const oldIndex =
    records.findIndex(
      x =>
        String(x.id) ===
        String(id)
    );


  const old =
    oldIndex >= 0
      ? records[oldIndex]
      : null;


  const imageRefs = [];


  if (files.length) {

    for (
      const file of files
    ) {

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

  } else if (
    old?.imageRefs?.length
  ) {

    imageRefs.push(
      ...old.imageRefs
    );

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
      old?.createdBy ||
      localStorage.getItem(
        "wr_user_name"
      ) ||
      "",

    syncStatus:
      "local",

    ...record,

    imageRefs

  };


  if (oldIndex >= 0) {

    if (files.length) {

      for (
        const ref of
        old.imageRefs || []
      ) {

        if (
          !imageRefs.includes(
            ref
          )
        ) {

          await wrDeleteFile(
            ref
          );

        }

      }

    }


    records[oldIndex] =
      full;


  } else {

    records.unshift(
      full
    );

  }


  wrSetRecords(
    records
  );


  const q =
    wrGetQueue()
      .filter(
        x =>
          String(x.id) !==
          String(id)
      );


  q.push(
    full
  );


  wrSetQueue(
    q
  );


  wrToast(
    oldIndex >= 0
      ? "تم تحديث التقرير وحفظ الصور"
      : "تم حفظ التقرير والصور في الأرشيف الذكي"
  );


  if (
    navigator.onLine
  ) {

    wrSyncPending();

  }


  return full;

}


/* =========================================================
   حذف سجل محلي
   ========================================================= */

async function wrDeleteRecord(id) {

  const records =
    wrGetRecords();


  const rec =
    records.find(
      r =>
        String(r.id) ===
        String(id)
    );


  for (
    const ref of
    rec?.imageRefs || []
  ) {

    await wrDeleteFile(
      ref
    );

  }


  wrSetRecords(
    records.filter(
      r =>
        String(r.id) !==
        String(id)
    )
  );


  wrSetQueue(
    wrGetQueue()
      .filter(
        r =>
          String(r.id) !==
          String(id)
      )
  );

}


/* =========================================================
   المزامنة
   ========================================================= */

async function wrSyncPending() {

  if (
    !window.WRGraph
      ?.configured()
  ) {

    return {

      synced: 0,

      pending:
        wrGetQueue()
          .length,

      configured:
        false

    };

  }


  const queue =
    wrGetQueue();


  const remain = [];

  let synced = 0;


  for (
    const r of queue
  ) {

    try {

      await WRGraph.uploadJson(
        r
      );


      synced++;


      const all =
        wrGetRecords();


      const ix =
        all.findIndex(
          x =>
            String(x.id) ===
            String(r.id)
        );


      if (ix >= 0) {

        all[ix].syncStatus =
          "synced";


        all[ix].syncedAt =
          new Date()
            .toISOString();


        wrSetRecords(
          all
        );

      }


    } catch (e) {

      r.lastSyncError =
        e.message;


      remain.push(
        r
      );

    }

  }


  wrSetQueue(
    remain
  );


  if (synced) {

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

function wrFormatDate(v) {

  if (!v) {
    return "—";
  }


  return new Date(
    v + "T00:00:00"
  ).toLocaleDateString(
    "ar-BH",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

}


/* =========================================================
   تنسيق الوقت
   ========================================================= */

function wrFormatTime(v) {

  if (!v) {
    return "—";
  }


  let [h, m] =
    v.split(":");


  h =
    Number(h);


  const p =
    h >= 12
      ? "م"
      : "ص";


  h =
    h % 12 ||
    12;


  return `${h}:${m} ${p}`;

}


/* =========================================================
   نقاط
   ========================================================= */

function wrBullets(v) {

  const arr =
    (v || "")
      .split("\n")
      .map(
        x =>
          x.trim()
      )
      .filter(
        Boolean
      );


  return arr.length
    ? arr
        .map(
          x =>
            "• " + x
        )
        .join("\n")
    : "—";

}


/* =========================================================
   Toast
   ========================================================= */

function wrToast(msg) {

  let e =
    document.getElementById(
      "wrToast"
    );


  if (!e) {

    e =
      document.createElement(
        "div"
      );


    e.id =
      "wrToast";


    Object.assign(
      e.style,
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
      e
    );

  }


  e.textContent =
    msg;


  e.style.display =
    "block";


  clearTimeout(
    window.__wrToast
  );


  window.__wrToast =
    setTimeout(
      () =>
        e.style.display =
          "none",
      2600
    );

}


/* =========================================================
   اسم آمن للملفات
   ========================================================= */

function wrSafeName(v) {

  return (
    v ||
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
) {

  const a =
    document.createElement(
      "a"
    );


  a.href =
    URL.createObjectURL(
      blob
    );


  a.download =
    name;


  document.body.appendChild(
    a
  );


  a.click();


  setTimeout(
    () => {

      URL.revokeObjectURL(
        a.href
      );


      a.remove();

    },
    1200
  );

}


/* =========================================================
   نسخة احتياطية
   ========================================================= */

async function wrExport() {

  const records =
    wrGetRecords();


  const files = {};


  for (
    const rec of records
  ) {

    for (
      const ref of
      rec.imageRefs || []
    ) {

      const f =
        await wrGetFile(
          ref
        );


      if (f) {

        files[ref] = {

          name:
            f.name,

          type:
            f.type,

          data:
            await wrBlobToDataURL(
              f.blob
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

            version: 3,

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
) {

  const [head, data] =
    dataURL.split(",");


  const mime =
    (
      head.match(
        /data:(.*?);/
      ) ||
      []
    )[1] ||
    "application/octet-stream";


  const bin =
    atob(data);


  const arr =
    new Uint8Array(
      bin.length
    );


  for (
    let i = 0;
    i < bin.length;
    i++
  ) {

    arr[i] =
      bin.charCodeAt(i);

  }


  return new Blob(
    [arr],
    {
      type: mime
    }
  );

}


/* =========================================================
   استيراد النسخة الاحتياطية
   ========================================================= */

function wrImport(
  file,
  cb
) {

  const r =
    new FileReader();


  r.onload =
    async () => {

      try {

        const data =
          JSON.parse(
            r.result
          );


        const records =
          Array.isArray(
            data
          )
            ? data
            : data.records;


        if (
          !Array.isArray(
            records
          )
        ) {

          throw new Error();

        }


        if (
          data.files
        ) {

          const db =
            await wrOpenDB();


          await new Promise(
            (
              resolve,
              reject
            ) => {

              const tx =
                db.transaction(
                  "files",
                  "readwrite"
                );


              const store =
                tx.objectStore(
                  "files"
                );


              Object.entries(
                data.files
              ).forEach(
                ([id, f]) => {

                  store.put({

                    id,

                    blob:
                      wrDataURLToBlob(
                        f.data
                      ),

                    name:
                      f.name,

                    type:
                      f.type,

                    createdAt:
                      new Date()
                        .toISOString()

                  });

                }
              );


              tx.oncomplete =
                resolve;


              tx.onerror =
                () =>
                  reject(
                    tx.error
                  );

            }
          );


          db.close();

        }


        wrSetRecords(
          records
        );


        if (
          Array.isArray(
            data.queue
          )
        ) {

          wrSetQueue(
            data.queue
          );

        }


        if (cb) {
          cb(true);
        }


      } catch (e) {

        console.error(
          e
        );


        if (cb) {
          cb(false);
        }

      }

    };


  r.readAsText(
    file
  );

}


/* =========================================================
   أسماء أنواع السجلات
   ========================================================= */

function wrTypeLabel(t) {

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
        "شهادة"

    }
  )[t] || t;

}


/* =========================================================
   مزامنة عند عودة الإنترنت
   ========================================================= */

window.addEventListener(
  "online",
  () =>
    wrSyncPending()
);


/* =========================================================
   Service Worker
   ========================================================= */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    async () => {

      if (
        [
          "127.0.0.1",
          "localhost"
        ].includes(
          location.hostname
        )
      ) {

        for (
          const r of
          await navigator
            .serviceWorker
            .getRegistrations()
        ) {

          await r.unregister();

        }


        return;

      }


      navigator
        .serviceWorker
        .register(
          (
            location.pathname.includes(
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