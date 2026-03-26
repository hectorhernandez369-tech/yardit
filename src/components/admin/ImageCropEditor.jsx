import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export default function ImageCropEditor({ imageUrl, open, onClose, onApply, aspectRatio = 16 / 9 }) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const previewWidth = 600;
  const previewHeight = Math.round(previewWidth / aspectRatio);

  useEffect(() => {
    if (!imageUrl || !open) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      // Reset position on new image
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    img.src = imageUrl;
  }, [imageUrl, open]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setOffsetX((prev) => prev + deltaX);
    setOffsetY((prev) => prev + deltaY);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const drawCropPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    // Clear canvas
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, previewWidth, previewHeight);

    // Draw image with transform
    ctx.save();
    ctx.translate(previewWidth / 2, previewHeight / 2);
    const scaledWidth = (img.width * zoom) / 2;
    const scaledHeight = (img.height * zoom) / 2;
    ctx.drawImage(img, offsetX - scaledWidth, offsetY - scaledHeight, img.width * zoom, img.height * zoom);
    ctx.restore();

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((previewWidth * i) / 3, 0);
      ctx.lineTo((previewWidth * i) / 3, previewHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, (previewHeight * i) / 3);
      ctx.lineTo(previewWidth, (previewHeight * i) / 3);
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawCropPreview();
  }, [zoom, offsetX, offsetY]);

  const handleApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    // Create output canvas (1920x1080 for 16:9)
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = 1920;
    outputCanvas.height = 1080;
    const outputCtx = outputCanvas.getContext("2d");

    // Calculate scaling to fit output resolution
    const scale = 1920 / previewWidth;

    // Draw cropped image to output
    outputCtx.fillStyle = "#ffffff";
    outputCtx.fillRect(0, 0, 1920, 1080);

    outputCtx.save();
    outputCtx.translate(960, 540);
    const scaledWidth = (img.width * zoom * scale) / 2;
    const scaledHeight = (img.height * zoom * scale) / 2;
    outputCtx.drawImage(
      img,
      offsetX * scale - scaledWidth,
      offsetY * scale - scaledHeight,
      img.width * zoom * scale,
      img.height * zoom * scale
    );
    outputCtx.restore();

    // Convert to blob
    outputCanvas.toBlob((blob) => {
      onApply(blob);
      onClose();
    }, "image/jpeg", 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop & Zoom Background (16:9)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Canvas */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={previewWidth}
              height={previewHeight}
              onMouseDown={handleMouseDown}
              className="border-2 border-[#2C4F4E] rounded-lg cursor-grab active:cursor-grabbing bg-gray-100"
            />
          </div>

          {/* Zoom Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <ZoomOut className="w-4 h-4 text-slate-600" />
              <Slider
                value={[zoom]}
                onValueChange={(val) => setZoom(val[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-slate-600" />
              <span className="text-sm text-slate-600 w-10 text-right">{(zoom * 100).toFixed(0)}%</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoom(1);
                setOffsetX(0);
                setOffsetY(0);
              }}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-slate-500 text-center">
            Drag to reposition • Output: 1920x1080px
          </p>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" className="bg-[#5DADA5] hover:bg-[#4A9B93]" onClick={handleApply}>
              Apply Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}