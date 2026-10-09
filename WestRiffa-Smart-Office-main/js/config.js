window.WR_CONFIG = {

  appName: "WestRiffa Smart Office",

  supabaseUrl: "https://rupbuipzaguiiphmswny.supabase.co",

  supabaseKey: "sb_publishable_C_uOzV3F5yrPSdkNbCoGgA_s44qiL9w",

  schoolName: "مدرسة الرفاع الغربي الابتدائية للبنين",

  microsoft: {

    enabled: false,

    tenantId: "PUT_TENANT_ID_HERE",

    clientId: "PUT_APP_CLIENT_ID_HERE",

    redirectUri:
      window.location.origin +
      window.location.pathname.replace(
        /\/pages\/.*/,
        "/index.html"
      ),

    scopes: [
      "User.Read",
      "Sites.ReadWrite.All",
      "Files.ReadWrite.All"
    ]

  },

  sharePoint: {

    siteId: "PUT_SITE_ID_HERE",

    driveId: "PUT_DOCUMENT_LIBRARY_DRIVE_ID_HERE",

    folders: {

      activity: "General/Activities",

      invitation: "General/Invitations",

      meeting: "General/Meetings",

      attendance: "General/Meetings/Attendance",

      recommendation: "General/Meetings/Recommendations",

      certificate: "General/Certificates",

      archive: "General/Archive",

      images: "General/Images",

      reports: "General/Reports",

      templates: "General/Templates"

    }

  }

};