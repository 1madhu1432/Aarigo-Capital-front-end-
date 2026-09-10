import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/app-store";
import type { Customer } from "@/types";

interface CustomerPhotoUploadProps {
  customer: Customer;
  className?: string;
}

export function CustomerPhotoUpload({ customer, className }: CustomerPhotoUploadProps) {
  const { updateCustomerPhoto } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateCustomerPhoto(customer.id, dataUrl);
        toast.success("Customer photo updated successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    updateCustomerPhoto(customer.id, "");
    toast.success("Customer photo removed.");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      mediaStreamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error("Camera access denied or unavailable.");
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      updateCustomerPhoto(customer.id, dataUrl);
      toast.success("Photo captured and updated!");
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className={`border border-border/80 bg-card ${className ?? ""}`}>
      <CardContent className="p-4 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="font-bold text-xs">Customer Photo</span>
          </div>
          {customer.photo && (
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Photo Attached
            </span>
          )}
        </div>

        {isCameraActive ? (
          <div className="space-y-3 flex flex-col items-center">
            <div className="relative w-48 h-48 rounded-xl overflow-hidden border-2 border-primary bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={captureCameraPhoto} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                <Camera className="h-3.5 w-3.5 mr-1" /> Snap Photo
              </Button>
              <Button size="sm" variant="outline" onClick={stopCamera} className="h-8 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-md">
              {customer.photo ? (
                <AvatarImage src={customer.photo} alt={customer.name} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="space-y-2 flex-1 text-center sm:text-left">
              <p className="text-[11px] text-muted-foreground">
                Upload or capture a passport-size customer photograph for official loan records & identification.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 mr-1 text-primary" />
                  {customer.photo ? "Replace Photo" : "Upload Photo"}
                </Button>

                {Boolean(navigator.mediaDevices?.getUserMedia) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={startCamera}
                    className="h-8 text-xs cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5 mr-1 text-purple-600" />
                    Camera
                  </Button>
                )}

                {customer.photo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemovePhoto}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
