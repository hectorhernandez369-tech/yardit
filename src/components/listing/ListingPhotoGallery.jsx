import React from "react";

export default function ListingPhotoGallery({
  images,
  selectedIndex,
  onIndexChange,
  title,
}) {
  const handleTouchStart = (e) => {
    onIndexChange({ _touchStart: e.targetTouches[0].clientX });
  };

  const handleTouchMove = (e) => {
    onIndexChange({ _touchMove: e.targetTouches[0].clientX });
  };

  const handleTouchEnd = (touchStart, touchEnd) => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50 && selectedIndex < images.length - 1) {
      onIndexChange(selectedIndex + 1);
    } else if (distance < -50 && selectedIndex > 0) {
      onIndexChange(selectedIndex - 1);
    }
  };

  const handlePhotoClick = (e) => {
    if (images.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      onIndexChange(prev => (prev > 0 ? prev - 1 : prev));
    } else {
      onIndexChange(prev => (prev + 1) % images.length);
    }
  };

  const mainImage = images[selectedIndex] || images[0];
  if (!images.length) return null;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-[1.75rem] bg-slate-100 shadow-[0_12px_40px_rgba(15,23,42,0.16)] cursor-pointer select-none touch-pan-y"
        onClick={handlePhotoClick}
      >
        <img
          src={mainImage}
          alt={title}
          className="w-full max-h-[420px] sm:max-h-[480px] object-contain transition-opacity duration-300"
          draggable="false"
          key={mainImage}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onIndexChange(idx)}
              className={`overflow-hidden rounded-2xl bg-slate-100 shadow-sm transition-all ${
                selectedIndex === idx
                  ? "ring-2 ring-slate-900 ring-offset-2 ring-offset-white"
                  : "opacity-85 hover:opacity-100"
              }`}
            >
              <img
                src={url}
                alt={`Listing image ${idx + 1}`}
                className="h-24 sm:h-28 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}