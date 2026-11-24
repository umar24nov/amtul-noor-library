export const THEME_STORAGE_KEY = "amtul-noor-library-theme";

/**
 * Runs in <head> before paint so a saved theme never flashes the wrong colours.
 * Falls back to the operating-system preference until the visitor chooses one.
 */
export const themeInitScript = `(function(){try{var saved=localStorage.getItem("${THEME_STORAGE_KEY}");var dark=saved?saved==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var root=document.documentElement;root.classList.toggle("dark",dark);root.dataset.theme=dark?"dark":"light";var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",dark?"#18181b":"#ffffff")}catch(e){}})()`;
