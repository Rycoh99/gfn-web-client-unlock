// ==UserScript==
// @name         GeForce NOW web client unlock
// @namespace    https://play.geforcenow.com/
// @version      0.1.0
// @description  Overrides browser platform signals read by GeForce NOW to unlock full web client capabilities on Linux/macOS, including up to 2K resolution, 120 FPS and 10-bit color
// @match        https://play.geforcenow.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @inject-into  page
// ==/UserScript==

(function () {
  "use strict";

  const PROFILE = {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.208 Safari/537.36",
    appVersion:
      "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.208 Safari/537.36",
    platform: "Win32",
    vendor: "Google Inc.",
    languages: ["en-US", "en"],
    maxTouchPoints: 0,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    chromeVersion: "124.0.6367.208",
    uaDataPlatform: "Windows",
    platformVersion: "10.0.0",
    architecture: "x86",
    bitness: "64",
    model: "",
    mobile: false,
    wow64: false,
    webglVendor: "Google Inc. (NVIDIA)",
    webglRenderer:
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    pluginNames: [
      "PDF Viewer",
      "Chrome PDF Viewer",
      "Chromium PDF Viewer",
    ],
    voiceNames: [
      "Google US English",
      "Microsoft David - English (United States)",
      "Microsoft Zira - English (United States)",
    ],
    hover: "hover",
    pointer: "fine",
  };

  function installRootProfile(profile, options) {
    const opts = options || {};
    const g = opts.root || globalThis;

    if (!g || g.__gfnRootProfilePatchV2) {
      return;
    }

    function markInstalled() {
      try {
        Object.defineProperty(g, "__gfnRootProfilePatchV2", {
          configurable: true,
          value: true,
        });
      } catch {}
    }

    function cloneJson(value) {
      if (!value || typeof value !== "object") {
        return value;
      }
      return JSON.parse(JSON.stringify(value));
    }

    function define(target, key, descriptor) {
      if (!target) {
        return false;
      }

      try {
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: false,
          ...descriptor,
        });
        return true;
      } catch {
        return false;
      }
    }

    function getter(target, key, value) {
      return define(target, key, {
        enumerable: true,
        get:
          typeof value === "function"
            ? value
            : function () {
                return value;
              },
      });
    }

    function value(target, key, nextValue) {
      return define(target, key, {
        writable: true,
        value: nextValue,
      });
    }

    function patchGetter(target, key, nextValue) {
      if (!target) {
        return;
      }

      const proto = Object.getPrototypeOf(target);
      if (!getter(proto, key, nextValue)) {
        getter(target, key, nextValue);
      }
    }

    function hideProperty(target, key) {
      if (!target) {
        return;
      }

      try {
        delete target[key];
      } catch {}

      try {
        if (target[key] === undefined) {
          return;
        }
      } catch {}

      define(target, key, {
        get() {
          return undefined;
        },
      });
    }

    function makeUAData() {
      const major = profile.chromeVersion.split(".")[0];
      const payload = {
        architecture: profile.architecture,
        bitness: profile.bitness,
        brands: [
          { brand: "Not.A/Brand", version: "99" },
          { brand: "Chromium", version: major },
          { brand: "Google Chrome", version: major },
        ],
        fullVersionList: [
          { brand: "Not.A/Brand", version: "99.0.0.0" },
          { brand: "Chromium", version: profile.chromeVersion },
          { brand: "Google Chrome", version: profile.chromeVersion },
        ],
        mobile: !!profile.mobile,
        model: profile.model,
        platform: profile.uaDataPlatform,
        platformVersion: profile.platformVersion,
        uaFullVersion: profile.chromeVersion,
        wow64: !!profile.wow64,
      };

      const uaData = {
        brands: cloneJson(payload.brands),
        mobile: payload.mobile,
        platform: payload.platform,
        getHighEntropyValues(hints) {
          const out = {};
          const keys = Array.isArray(hints) ? hints : [];

          keys.forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(payload, key)) {
              out[key] = cloneJson(payload[key]);
            }
          });

          out.brands = cloneJson(payload.brands);
          out.mobile = payload.mobile;
          out.platform = payload.platform;
          return Promise.resolve(out);
        },
        toJSON() {
          return {
            brands: cloneJson(payload.brands),
            mobile: payload.mobile,
            platform: payload.platform,
          };
        },
      };

      try {
        if (g.NavigatorUAData && g.NavigatorUAData.prototype) {
          Object.setPrototypeOf(uaData, g.NavigatorUAData.prototype);
        }
      } catch {}

      return uaData;
    }

    function makePluginArray(names) {
      const plugins = names.map(function (name) {
        return {
          name,
          filename: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".plugin",
          description: name,
          length: 0,
          item() {
            return null;
          },
          namedItem() {
            return null;
          },
        };
      });

      const pluginArray = {
        length: plugins.length,
        item(index) {
          return plugins[index] || null;
        },
        namedItem(name) {
          return (
            plugins.find(function (plugin) {
              return plugin.name === name;
            }) || null
          );
        },
        refresh() {},
        [Symbol.iterator]: function* () {
          yield* plugins;
        },
      };

      plugins.forEach(function (plugin, index) {
        pluginArray[index] = plugin;
        pluginArray[plugin.name] = plugin;
      });

      return pluginArray;
    }

    function makeVoices(names) {
      return names.map(function (name, index) {
        return {
          default: index === 0,
          lang: "en-US",
          localService: true,
          name,
          voiceURI: name,
        };
      });
    }

    function patchNavigator() {
      const nav = g.navigator;
      if (!nav) {
        return;
      }

      const languages = Object.freeze(profile.languages.slice());
      const plugins = makePluginArray(profile.pluginNames);
      const uaData = makeUAData();

      patchGetter(nav, "userAgent", profile.userAgent);
      patchGetter(nav, "appVersion", profile.appVersion);
      patchGetter(nav, "platform", profile.platform);
      patchGetter(nav, "vendor", profile.vendor);
      patchGetter(nav, "language", languages[0]);
      patchGetter(nav, "languages", languages);
      patchGetter(nav, "maxTouchPoints", profile.maxTouchPoints);
      patchGetter(nav, "hardwareConcurrency", profile.hardwareConcurrency);
      patchGetter(nav, "deviceMemory", profile.deviceMemory);
      patchGetter(nav, "plugins", plugins);
      patchGetter(nav, "mimeTypes", {
        length: 0,
        item() {
          return null;
        },
        namedItem() {
          return null;
        },
        [Symbol.iterator]: function* () {},
      });
      patchGetter(nav, "pdfViewerEnabled", true);
      patchGetter(nav, "webdriver", false);
      patchGetter(nav, "userAgentData", uaData);

      hideProperty(nav, "brave");
      const proto = Object.getPrototypeOf(nav);
      hideProperty(proto, "brave");
    }

    function patchChromeShape() {
      const chrome = g.chrome && typeof g.chrome === "object" ? g.chrome : {};

      chrome.runtime = chrome.runtime || {};
      chrome.app = chrome.app || { isInstalled: false };
      chrome.csi =
        chrome.csi ||
        function () {
          return {};
        };
      chrome.loadTimes =
        chrome.loadTimes ||
        function () {
          return {};
        };

      value(g, "chrome", chrome);
    }

    function patchWindowBrandLeaks() {
      [
        "opr",
        "oprt",
        "OperaTouch",
        "OperaGXDownloads",
        "OperaGXGames",
        "yandex",
        "QuickAccess",
        "__firefox__",
        "__gCrWeb",
        "ReactNativeWebView",
        "safari",
        "__edgeActiveElement",
        "__edgeTrackingPreventionStatistics",
        "webOSSystem",
        "tizen",
        "TizenTVApiInfo",
        "addEdgeEffectONSCROLLTizenUIF",
        "tizentvwasm",
        "HardkeyEvent",
        "browser",
      ].forEach(function (key) {
        hideProperty(g, key);
      });
    }

    function patchSpeech() {
      const fakeVoices = makeVoices(profile.voiceNames);

      function wrap(target) {
        if (!target || typeof target.getVoices !== "function") {
          return;
        }

        if (target.getVoices.__gfnRootProfileWrapped) {
          return;
        }

        const nativeGetVoices = target.getVoices;
        const wrapped = function () {
          let nativeVoices = [];

          try {
            nativeVoices = Array.from(nativeGetVoices.apply(this, arguments) || []);
          } catch {}

          const seen = new Set();
          return fakeVoices.concat(nativeVoices).filter(function (voice) {
            const key = voice && (voice.voiceURI || voice.name);
            if (!key || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        };

        value(wrapped, "__gfnRootProfileWrapped", true);
        value(target, "getVoices", wrapped);
      }

      if (g.SpeechSynthesis && g.SpeechSynthesis.prototype) {
        wrap(g.SpeechSynthesis.prototype);
      }

      if (g.speechSynthesis) {
        wrap(g.speechSynthesis);
      }
    }

    function patchMatchMedia() {
      if (typeof g.matchMedia !== "function") {
        return;
      }

      const nativeMatchMedia = g.matchMedia.bind(g);
      const hoverIsHover = profile.hover === "hover";
      const pointerIsFine = profile.pointer === "fine";
      const results = new Map([
        ["(hover: hover)", hoverIsHover],
        ["(hover: none)", !hoverIsHover],
        ["(any-hover: hover)", hoverIsHover],
        ["(any-hover: none)", !hoverIsHover],
        ["(pointer: fine)", pointerIsFine],
        ["(pointer: coarse)", !pointerIsFine],
        ["(any-pointer: fine)", pointerIsFine],
        ["(any-pointer: coarse)", !pointerIsFine],
      ]);

      value(g, "matchMedia", function (query) {
        const nativeResult = nativeMatchMedia(query);
        const normalized = String(query).replace(/\s+/g, " ").trim().toLowerCase();

        if (!results.has(normalized)) {
          return nativeResult;
        }

        return new Proxy(nativeResult, {
          get(target, prop, receiver) {
            if (prop === "matches") {
              return results.get(normalized);
            }
            if (prop === "media") {
              return String(query);
            }

            const got = Reflect.get(target, prop, receiver);
            return typeof got === "function" ? got.bind(target) : got;
          },
        });
      });
    }

    function patchWebGL(Ctor) {
      const proto = Ctor && Ctor.prototype;
      if (!proto || proto.__gfnRootProfileWrapped) {
        return;
      }

      const debugInfo = {
        UNMASKED_VENDOR_WEBGL: 37445,
        UNMASKED_RENDERER_WEBGL: 37446,
      };

      const nativeGetExtension = proto.getExtension;
      const nativeGetParameter = proto.getParameter;

      if (typeof nativeGetExtension === "function") {
        value(proto, "getExtension", function (name) {
          if (String(name).toLowerCase() === "webgl_debug_renderer_info") {
            return nativeGetExtension.apply(this, arguments) || debugInfo;
          }
          return nativeGetExtension.apply(this, arguments);
        });
      }

      if (typeof nativeGetParameter === "function") {
        value(proto, "getParameter", function (param) {
          if (param === debugInfo.UNMASKED_VENDOR_WEBGL) {
            return profile.webglVendor;
          }
          if (param === debugInfo.UNMASKED_RENDERER_WEBGL) {
            return profile.webglRenderer;
          }
          return nativeGetParameter.apply(this, arguments);
        });
      }

      value(proto, "__gfnRootProfileWrapped", true);
    }

    function workerType(options) {
      return options && typeof options === "object" && options.type === "module"
        ? "module"
        : "classic";
    }

    function workerSource(type, absoluteUrl) {
      const shim =
        "(" +
        installRootProfile.toString() +
        ")(" +
        JSON.stringify(profile) +
        ", { worker: true });\n";

      if (type === "module") {
        return shim + "import " + JSON.stringify(absoluteUrl) + ";\n";
      }

      return shim + "importScripts(" + JSON.stringify(absoluteUrl) + ");\n";
    }

    function wrapWorkerConstructor(name) {
      const NativeCtor = g[name];
      if (
        typeof NativeCtor !== "function" ||
        NativeCtor.__gfnRootProfileWrapped ||
        !g.Blob ||
        !g.URL ||
        !g.location
      ) {
        return;
      }

      function WrappedWorker(scriptUrl, options) {
        let blobUrl;

        try {
          const absoluteUrl = new URL(String(scriptUrl), g.location.href).href;
          const type = workerType(options);
          const source = workerSource(type, absoluteUrl);
          const blob = new g.Blob([source], { type: "text/javascript" });
          blobUrl = g.URL.createObjectURL(blob);
          return new NativeCtor(blobUrl, options);
        } catch {
          return new NativeCtor(scriptUrl, options);
        } finally {
          if (blobUrl) {
            g.setTimeout(function () {
              g.URL.revokeObjectURL(blobUrl);
            }, 60000);
          }
        }
      }

      WrappedWorker.prototype = NativeCtor.prototype;
      value(WrappedWorker, "__gfnRootProfileWrapped", true);
      value(g, name, WrappedWorker);
    }

    markInstalled();
    patchNavigator();
    patchChromeShape();
    patchWindowBrandLeaks();
    patchSpeech();
    patchMatchMedia();
    patchWebGL(g.WebGLRenderingContext);
    patchWebGL(g.WebGL2RenderingContext);

    if (!opts.worker) {
      wrapWorkerConstructor("Worker");
      wrapWorkerConstructor("SharedWorker");

      try {
        if (g.document && g.document.documentElement) {
          g.document.documentElement.dataset.gfnRootProfilePatch = "v2";
        }
      } catch {}
    }
  }

  function runInPageViaEval(profile) {
    if (typeof unsafeWindow === "undefined" || !unsafeWindow || !unsafeWindow.eval) {
      return false;
    }

    unsafeWindow.eval(
      "(" +
        installRootProfile.toString() +
        ")(" +
        JSON.stringify(profile) +
        ", { unsafeWindow: true });"
    );

    return true;
  }

  function runDirectlyOnUnsafeWindow(profile) {
    if (typeof unsafeWindow === "undefined" || !unsafeWindow) {
      return false;
    }

    installRootProfile(profile, {
      root: unsafeWindow,
      unsafeWindowDirect: true,
    });

    return true;
  }

  function injectIntoPage(profile) {
    if (typeof document === "undefined" || !document.createElement) {
      return false;
    }

    const source =
      "(" +
      installRootProfile.toString() +
      ")(" +
      JSON.stringify(profile) +
      ", { pageScript: true });";

    const script = document.createElement("script");
    script.textContent = source;

    const parent = document.documentElement || document.head || document;
    parent.appendChild(script);
    script.remove();

    return true;
  }

  if (!tryStep(runInPageViaEval) && !tryStep(runDirectlyOnUnsafeWindow)) {
    tryStep(injectIntoPage);
  }

  function tryStep(step) {
    try {
      return !!step(PROFILE);
    } catch {
      return false;
    }
  }
})();
