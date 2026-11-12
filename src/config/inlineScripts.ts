// The two tiny scripts that must run inside the page <head>, before anything else
// (src/app/layout.tsx). Kept here, apart from the layout, so they are easy to find
// and to check in a security review (docs/security.md).

// Puts the saved theme on <html> before the first paint, so a person who chose the
// light theme never sees a dark flash (and the other way round). The same key as in
// src/components/ui/ThemeToggle.tsx.
export const THEME_SCRIPT = `try{var t=localStorage.getItem("scamly-theme");if(t==="light"||t==="dark"||t==="system")document.documentElement.dataset.theme=t}catch(e){}`;

// Keeps the browser's early "this app can be installed" event (beforeinstallprompt),
// which can arrive before src/lib/install.ts has loaded.
export const INSTALL_SCRIPT = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__scamlyInstallEvent=e})`;
