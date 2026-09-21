let loading;

export default function loadMapboxGl() {
  if (!document.querySelector('link[data-yardit-mapbox-gl="true"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://api.mapbox.com/mapbox-gl-js/v3.30.0/mapbox-gl.css";
    css.dataset.yarditMapboxGl = "true";
    document.head.appendChild(css);
  }
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    // A previous failed script cannot emit another load event.
    document.querySelector('script[data-yardit-mapbox-gl="true"]')?.remove();
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.30.0/mapbox-gl.js";
    script.async = true;
    script.dataset.yarditMapboxGl = "true";
    const fail = (message) => {
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      script.remove();
      loading = null;
      reject(new Error(message));
    };
    const timer = setTimeout(() => fail("Mapbox's map library did not download. Check your connection and retry."), 20000);
    script.onload = () => {
      if (!window.mapboxgl) return fail("Mapbox's map library could not start.");
      clearTimeout(timer);
      resolve(window.mapboxgl);
    };
    script.onerror = () => fail("Mapbox's map library was blocked or could not download.");
    document.head.appendChild(script);
  });
  return loading;
}