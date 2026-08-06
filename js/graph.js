(function(){
  let msalInstance = null;
  let currentAccount = null;

  function cfg(){ return window.WR_CONFIG || {}; }
  function configured(){
    const c=cfg().microsoft||{};
    return !!(c.enabled && c.tenantId && c.clientId && !c.tenantId.startsWith("PUT_") && !c.clientId.startsWith("PUT_"));
  }
  async function init(){
    if(!configured() || !window.msal) return false;
    if(msalInstance) return true;
    const c=cfg().microsoft;
    msalInstance=new msal.PublicClientApplication({auth:{clientId:c.clientId,authority:`https://login.microsoftonline.com/${c.tenantId}`,redirectUri:c.redirectUri},cache:{cacheLocation:"localStorage",storeAuthStateInCookie:false}});
    await msalInstance.initialize();
    const result=await msalInstance.handleRedirectPromise();
    currentAccount=result?.account || msalInstance.getAllAccounts()[0] || null;
    if(currentAccount) msalInstance.setActiveAccount(currentAccount);
    return true;
  }
  async function login(){
    if(!await init()) throw new Error("Microsoft integration is not configured");
    const scopes=cfg().microsoft.scopes||["User.Read"];
    const res=await msalInstance.loginPopup({scopes});
    currentAccount=res.account;msalInstance.setActiveAccount(currentAccount);return currentAccount;
  }
  async function token(){
    if(!await init()) throw new Error("Microsoft integration is not configured");
    if(!currentAccount) await login();
    try{return (await msalInstance.acquireTokenSilent({account:currentAccount,scopes:cfg().microsoft.scopes})).accessToken}
    catch{return (await msalInstance.acquireTokenPopup({account:currentAccount,scopes:cfg().microsoft.scopes})).accessToken}
  }
  async function graph(path,options={}){
    const accessToken=await token();
    const res=await fetch(`https://graph.microsoft.com/v1.0${path}`,{...options,headers:{Authorization:`Bearer ${accessToken}`,...(options.headers||{})}});
    if(!res.ok){throw new Error(`${res.status} ${await res.text()}`)}
    if(res.status===204)return null;
    const ct=res.headers.get("content-type")||"";return ct.includes("json")?res.json():res.text();
  }
  async function uploadJson(record){
    const c=cfg().sharePoint||{},siteId=c.siteId,driveId=c.driveId;
    if(!siteId||!driveId||siteId.startsWith("PUT_")||driveId.startsWith("PUT_")) throw new Error("SharePoint IDs are not configured");
    const folder=(c.folders||{})[record.type] || (c.folders||{}).archive || "General/Archive";
    const safe=(record.title||record.type||"record").replace(/[\\/:*?\"<>|#%]/g,"-").slice(0,80);
    const file=`${new Date().toISOString().replace(/[:.]/g,"-")}-${safe}.json`;
    const path=`/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${folder}/${file}:/content`;
    return graph(path,{method:"PUT",headers:{"Content-Type":"application/json;charset=utf-8"},body:JSON.stringify(record,null,2)});
  }
  async function test(){
    if(!configured()) return {ok:false,message:"الربط غير مُعد بعد"};
    try{const me=await graph("/me");return {ok:true,message:`تم الاتصال: ${me.displayName||me.userPrincipalName}`}}
    catch(e){return {ok:false,message:e.message}}
  }
  window.WRGraph={configured,init,login,uploadJson,test,getAccount:()=>currentAccount};
})();
