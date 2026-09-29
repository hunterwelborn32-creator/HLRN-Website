(function () {

    const APP_URL =
        "https://script.google.com/macros/s/AKfycbyX5H27GP1LS7lFvCw_m9PirJlCCpMYRQkU8ovkYJOlmhyWcCy8qFvSKeBL_-SXiNT8/exec";

    const LOGIN_KEY = "hlrn_driver_login_device_v1";
    const DEVICE_KEY_STORAGE = "hlrn_driver_permanent_device_key_v2";

    const signIn = document.getElementById("hlrnDriverSignIn");
    const headerLogin = document.getElementById("hlrnHeaderDriverLogin");
    const account = document.getElementById("hlrnDriverAccount");
    const accountButton = document.getElementById("hlrnDriverAccountButton");
    const accountMenu = document.getElementById("hlrnDriverAccountMenu");
    const accountName = document.getElementById("hlrnDriverAccountName");
    const menuName = document.getElementById("hlrnDriverMenuName");
    const menuDiscord = document.getElementById("hlrnDriverMenuDiscord");
    const myProfile = document.getElementById("hlrnDriverMyProfile");
    const signOut = document.getElementById("hlrnDriverSignOut");

    let activeLogin = null;
    let currentRequestToken = "";
    let pollTimer = null;
    let pollNumber = 0;
    let jsonpNumber = 0;
    let restoreInFlight = false;
    let lastRestoreAt = 0;

    function hashString(value, seed) {
        let hash = seed >>> 0;
        const text = String(value || "");
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
            hash >>>= 0;
        }
        return ("00000000" + hash.toString(16)).slice(-8);
    }

    /*
     * This recreates the OLD fingerprint device key one time only.
     * That lets existing signed-in users keep their current server
     * session when upgrading to the permanent device key system.
     */
    function makeLegacyDeviceKey() {
        let timezone = "";
        try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }
        catch (error) {}

        const screenValue = window.screen
            ? [screen.width,screen.height,screen.colorDepth,screen.pixelDepth].join("x")
            : "";

        const fingerprint = [
            navigator.userAgent || "",
            navigator.platform || "",
            navigator.language || "",
            timezone,
            screenValue,
            navigator.hardwareConcurrency || "",
            navigator.deviceMemory || "",
            navigator.maxTouchPoints || ""
        ].join("|");

        return "dev_" +
            hashString(fingerprint,2166136261) +
            hashString(fingerprint,3339675911) +
            hashString(fingerprint,2654435761) +
            hashString(fingerprint,2246822519);
    }

    function makeRandomDeviceKey() {
        let value = "";

        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            value = window.crypto.randomUUID().replace(/-/g, "") +
                window.crypto.randomUUID().replace(/-/g, "");
        } else {
            value = Date.now().toString(36) +
                Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2);
        }

        return "dev_" + value.slice(0, 96);
    }

    function getPermanentDeviceKey() {
        try {
            const saved = String(localStorage.getItem(DEVICE_KEY_STORAGE) || "").trim();
            if (/^[A-Za-z0-9_-]{12,128}$/.test(saved)) {
                return saved;
            }

            /*
             * Prefer the legacy key during migration so an existing
             * Device Sessions row continues to match immediately.
             */
            const migrated = makeLegacyDeviceKey();
            localStorage.setItem(DEVICE_KEY_STORAGE, migrated);
            return migrated;
        }
        catch (error) {
            /* localStorage unavailable: use a stable-ish fallback. */
            return makeLegacyDeviceKey() || makeRandomDeviceKey();
        }
    }

    const DEVICE_KEY = getPermanentDeviceKey();

    function makeRequestToken() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return (window.crypto.randomUUID()+"-"+window.crypto.randomUUID()).replace(/-/g,"");
        }
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2);
    }

    function cleanLogin(data) {
        if (!data || typeof data !== "object") return null;
        const driver = String(data.driver || "").trim();
        if (!driver) return null;
        return {
            driver: driver,
            discordUsername: String(data.discordUsername || "").trim(),
            discordDisplayName: String(data.discordDisplayName || "").trim(),
            discordId: String(data.discordId || "").trim()
        };
    }

    function renderLogin(data) {
        const safe = cleanLogin(data);
        activeLogin = safe;

        if (!safe) {
            if (headerLogin) {
                headerLogin.textContent = "DRIVER LOGIN";
                headerLogin.setAttribute("aria-label", "HLRN Driver Login");
            }
            if (signIn) signIn.hidden = false;
            if (account) account.hidden = true;
            if (accountMenu) accountMenu.hidden = true;
            if (accountButton) accountButton.setAttribute("aria-expanded","false");
            return;
        }

        if (signIn) signIn.hidden = true;
        if (account) account.hidden = false;
        if (headerLogin) {
            headerLogin.textContent = safe.driver.toUpperCase();
            headerLogin.setAttribute("aria-label", "Open HLRN driver account for " + safe.driver);
        }
        if (accountName) accountName.textContent = safe.driver;
        if (menuName) menuName.textContent = safe.driver;

        if (menuDiscord) {
            if (safe.discordUsername) menuDiscord.textContent = "Discord: @" + safe.discordUsername;
            else if (safe.discordDisplayName) menuDiscord.textContent = "Discord: " + safe.discordDisplayName;
            else menuDiscord.textContent = "Discord account connected";
        }
    }

    function saveLogin(data) {
        const safe = cleanLogin(data);
        if (!safe) return;

        try {
            localStorage.setItem(LOGIN_KEY,JSON.stringify(safe));
        }
        catch (error) {}

        renderLogin(safe);
    }

    function loadLocalLogin() {
        try {
            const raw = localStorage.getItem(LOGIN_KEY);
            if (!raw) return null;
            return cleanLogin(JSON.parse(raw));
        }
        catch (error) {
            return null;
        }
    }

    function clearLocalLogin() {
        try {
            localStorage.removeItem(LOGIN_KEY);
        }
        catch (error) {}
    }

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
    }

    /*
     * Reliable JSONP helper.  A timeout/network problem reports an
     * error to the callback instead of silently making the page think
     * the driver signed out.
     */
    function runJsonp(action, params, callback) {
        jsonpNumber++;

        const callbackName = "hlrnJsonp_" + Date.now() + "_" + jsonpNumber;
        const script = document.createElement("script");
        let finished = false;
        let timeoutId = null;

        function cleanup() {
            if (finished) return;
            finished = true;

            if (timeoutId) clearTimeout(timeoutId);

            try { delete window[callbackName]; }
            catch (error) { window[callbackName] = undefined; }

            if (script.parentNode) script.parentNode.removeChild(script);
        }

        function finish(result) {
            if (finished) return;

            try {
                callback(result || {});
            }
            finally {
                cleanup();
            }
        }

        window[callbackName] = function(result) {
            finish(result || {});
        };

        script.onerror = function() {
            finish({ok:false,status:"network_error"});
        };

        let url = APP_URL + "?action=" + encodeURIComponent(action) +
            "&callback=" + encodeURIComponent(callbackName) +
            "&_=" + Date.now();

        Object.keys(params || {}).forEach(function(key) {
            url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        });

        script.src = url;
        document.head.appendChild(script);

        timeoutId = setTimeout(function() {
            finish({ok:false,status:"timeout"});
        },12000);
    }

    function restoreDeviceLogin(force) {
        const now = Date.now();

        if (restoreInFlight) return;
        if (!force && now - lastRestoreAt < 15000) return;

        restoreInFlight = true;
        lastRestoreAt = now;

        runJsonp(
            "deviceStatus",
            {device:DEVICE_KEY},
            function(result) {
                restoreInFlight = false;

                if (
                    result &&
                    result.ok &&
                    result.status === "active" &&
                    result.driver
                ) {
                    saveLogin({
                        driver: result.driver,
                        discordUsername: result.discordUsername || "",
                        discordDisplayName: result.discordDisplayName || "",
                        discordId: result.discordId || ""
                    });
                    return;
                }

                /*
                 * ONLY an explicit server revocation logs the browser
                 * out. Unknown devices, Apps Script hiccups, timeouts,
                 * network errors and temporary bad responses leave the
                 * locally saved login untouched.
                 */
                if (result && result.ok && result.status === "revoked") {
                    clearLocalLogin();
                    renderLogin(null);
                }
            }
        );
    }

    function pollLoginStatus() {
        if (!currentRequestToken) return;

        pollNumber++;

        const callbackName =
            "hlrnLoginPollCallback_" + Date.now() + "_" + pollNumber;

        const script = document.createElement("script");
        let finished = false;
        let timeoutId = null;

        function cleanup() {
            if (finished) return;
            finished = true;

            if (timeoutId) clearTimeout(timeoutId);

            try { delete window[callbackName]; }
            catch (error) { window[callbackName] = undefined; }

            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callbackName] = function(result) {
            if (
                result &&
                result.ok &&
                result.status === "complete" &&
                result.driver
            ) {
                saveLogin({
                    driver: result.driver,
                    discordUsername: result.discordUsername || "",
                    discordDisplayName: result.discordDisplayName || "",
                    discordId: result.discordId || ""
                });

                currentRequestToken = "";
                stopPolling();

                /* Give Apps Script a moment to finish writing Device Sessions. */
                setTimeout(function(){
                    restoreDeviceLogin(true);
                },800);
            }

            cleanup();
        };

        script.onerror = cleanup;

        script.src = APP_URL + "?action=status&request=" +
            encodeURIComponent(currentRequestToken) +
            "&callback=" + encodeURIComponent(callbackName) +
            "&_=" + Date.now();

        document.head.appendChild(script);

        timeoutId = setTimeout(cleanup,12000);
    }

    function startPolling(requestToken) {
        currentRequestToken = requestToken;
        stopPolling();
        pollLoginStatus();
        pollTimer = setInterval(pollLoginStatus,1800);
    }

    if (signIn) {
        signIn.href = "#";
        signIn.removeAttribute("target");

        signIn.addEventListener("click",function(event) {
            event.preventDefault();

            const requestToken = makeRequestToken();
            startPolling(requestToken);

            const loginUrl =
                APP_URL +
                "?action=login&request=" + encodeURIComponent(requestToken) +
                "&device=" + encodeURIComponent(DEVICE_KEY);

            const loginWindow = window.open(loginUrl,"_blank");
            if (!loginWindow) window.location.href = loginUrl;
        });
    }

    /* The navigation login must use the SAME request token/device flow
       as the hero login, otherwise Discord can succeed without this page
       receiving its completed session. */
    if (headerLogin) {
        headerLogin.addEventListener("click", function(event) {
            event.preventDefault();
            if (activeLogin && accountButton) {
                accountButton.click();
                if (accountMenu && !accountMenu.hidden) {
                    accountButton.scrollIntoView({block:"nearest",behavior:"smooth"});
                }
            } else if (signIn) {
                signIn.click();
            }
        });
    }

    if (accountButton) {
        accountButton.addEventListener("click",function(event) {
            event.stopPropagation();
            const willOpen = accountMenu.hidden;
            accountMenu.hidden = !willOpen;
            accountButton.setAttribute("aria-expanded",String(willOpen));
        });
    }

    document.addEventListener("click",function() {
        if (accountMenu) accountMenu.hidden = true;
        if (accountButton) accountButton.setAttribute("aria-expanded","false");
    });

    if (accountMenu) {
        accountMenu.addEventListener("click",function(event) {
            event.stopPropagation();
        });
    }

    if (myProfile) {
        myProfile.addEventListener("click",function(event) {
            event.stopPropagation();
            if (!activeLogin || !activeLogin.driver) return;

            if (accountMenu) accountMenu.hidden = true;
            if (accountButton) accountButton.setAttribute("aria-expanded","false");

            if (typeof window.openHomeDriverProfile === "function") {
                window.openHomeDriverProfile(activeLogin.driver);
            }
        });
    }

    if (signOut) {
        signOut.addEventListener("click",function() {
            stopPolling();
            currentRequestToken = "";

            /* Sign out immediately on this browser. */
            clearLocalLogin();
            renderLogin(null);

            /* Revoke this exact permanent device session server-side. */
            runJsonp(
                "deviceLogout",
                {device:DEVICE_KEY},
                function(){}
            );
        });
    }

    /*
     * INSTANT STARTUP:
     * Display the cached account first. Never flash Sign In while
     * waiting for Apps Script if we already know who the driver is.
     */
    const cachedLogin = loadLocalLogin();

    if (cachedLogin) {
        renderLogin(cachedLogin);
    } else {
        renderLogin(null);
    }

    /* Quietly verify in the background. */
    restoreDeviceLogin(true);

    /* Periodic verification without hammering Apps Script. */
    setInterval(function() {
        restoreDeviceLogin(false);
    },120000);

    document.addEventListener("visibilitychange",function() {
        if (!document.hidden) restoreDeviceLogin(false);
    });

    window.addEventListener("focus",function() {
        restoreDeviceLogin(false);
    });

})();

(function(){
  const selector = [
    '.hlrn-race-card',
    '.hlrn-racing-card',
    '.hlrn-driver-card',
    '.hlrn-social-card',
    '.incident-row',
    '.incident-average-table',
    '.hlrn-section-title'
  ].join(',');

  const addReveal = () => {
    document.querySelectorAll(selector).forEach(el=>{
      if(!el.classList.contains('hlrn-reveal-race')){
        el.classList.add('hlrn-reveal-race');
      }
    });
  };

  addReveal();

  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('hlrn-in-view');
          io.unobserve(entry.target);
        }
      });
    },{threshold:.08});

    const observe = () => {
      document.querySelectorAll('.hlrn-reveal-race:not(.hlrn-in-view)').forEach(el=>io.observe(el));
    };
    observe();

    const mo = new MutationObserver(()=>{
      addReveal();
      observe();
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }else{
    document.querySelectorAll('.hlrn-reveal-race').forEach(el=>el.classList.add('hlrn-in-view'));
  }
})();
