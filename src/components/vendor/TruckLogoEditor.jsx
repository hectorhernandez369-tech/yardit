import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

const CANVAS_SIZE = 320;
const OUTPUT_SIZE = 800;

export default function TruckLogoEditor({ imageUrl, open, onClose, onApply }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [tolerance, setTolerance] = useState(42);

  useEffect(() => {
    if (!open || !imageUrl) return;
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl, open]);

  const drawImageToCanvas = (canvas, size) => {
    const img = imageRef.current;
    if (!canvas || !img) return null;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, size, size);

    const baseScale = Math.max(size / img.width, size / img.height);
    const scaledWidth = img.width * baseScale * zoom;
    const scaledHeight = img.height * baseScale * zoom;
    const scale = size / CANVAS_SIZE;
    const x = (size - scaledWidth) / 2 + offset.x * scale;
    const y = (size - scaledHeight) / 2 + offset.y * scale;
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    if (removeBackground) {
      const data = ctx.getImageData(0, 0, size, size);
      const pixels = data.data;
      const samples = [0, (size - 1) * 4, (size * (size - 1)) * 4, ((size * size) - 1) * 4];
      const bg = samples.reduce((acc, index) => ({ r: acc.r + pixels[index], g: acc.g + pixels[index + 1], b: acc.b + pixels[index + 2] }), { r: 0, g: 0, b: 0 });
      bg.r /= samples.length;
      bg.g /= samples.length;
      bg.b /= samples.length;

      for (let i = 0; i < pixels.length; i += 4) {
        const distance = Math.sqrt((pixels[i] - bg.r) ** 2 + (pixels[i + 1] - bg.g) ** 2 + (pixels[i + 2] - bg.b) ** 2);
        if (distance < tolerance * 2.2) pixels[i + 3] = Math.max(0, pixels[i + 3] * (distance / (tolerance * 2.2)));
      }
      ctx.putImageData(data, 0, 0);
    }

    return canvas;
  };

  useEffect(() => {
    drawImageToCanvas(canvasRef.current, CANVAS_SIZE);
  }, [zoom, offset, removeBackground, tolerance]);

  const handlePointerMove = (event) => {
    if (!dragStart) return;
    setOffset((current) => ({ x: current.x + event.clientX - dragStart.x, y: current.y + event.clientY - dragStart.y }));
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleApply = () => {
    const outputCanvas = document.createElement("canvas");
    drawImageToCanvas(outputCanvas, OUTPUT_SIZE);
    outputCanvas.toBlob((blob) => {
      if (!blob) return;
      onApply(new File([blob], "truck-logo.png", { type: "image/png" }));
      onClose();
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader><DialogTitle>Edit Truck Logo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="mx-auto w-fit rounded-2xl border p-3 bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onPointerDown={(event) => setDragStart({ x: event.clientX, y: event.clientY })}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDragStart(null)}
              onPointerLeave={() => setDragStart(null)}
              className="h-72 w-72 cursor-grab rounded-xl active:cursor-grabbing"
              style={{ touchAction: "none" }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-muted-foreground" />
              <Slider value={[zoom]} min={0.5} max={3} step={0.05} onValueChange={(value) => setZoom(value[0])} />
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-medium">Remove background</span>
              <Switch checked={removeBackground} onCheckedChange={setRemoveBackground} />
            </div>
            {removeBackground && <Slider value={[tolerance]} min={10} max={90} step={1} onValueChange={(value) => setTolerance(value[0])} />}
            <Button type="button" variant="outline" className="w-full" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>
              <RotateCcw className="w-4 h-4" /> Reset crop
            </Button>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleApply}>Confirm & Save Photo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}