let loading;

const MAPBOX_GL_VERSION = "2.15.0";
const MAPBOX_GL_CDN = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}`;

export default function loadMapboxGl() {
  let css = document.querySelector('link[data-yardit-mapbox-gl="true"]');
  if (!css) {
    css = document.createElement("link");
    css.rel = "stylesheet";
    css.dataset.yarditMapboxGl = "true";
    document.head.appendChild(css);
  }
  css.href = `${MAPBOX_GL_CDN}/mapbox-gl.css`;

  if (window.mapboxgl?.version === MAPBOX_GL_VERSION) return Promise.resolve(window.mapboxgl);
  if (window.mapboxgl) {
    document.querySelector('script[data-yardit-mapbox-gl="true"]')?.remove();
    delete window.mapboxgl;
    loading = null;
  }
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    // A previous failed script cannot emit another load event.
    document.querySelector('script[data-yardit-mapbox-gl="true"]')?.remove();
    const script = document.createElement("script");
    script.src = `${MAPBOX_GL_CDN}/mapbox-gl.js`;
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