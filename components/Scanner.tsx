import React, { useEffect } from 'react';

// This tells TypeScript that Html5Qrcode is available globally from the CDN script.
declare var Html5Qrcode: any;

interface ScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
  onReady: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onScanError, onReady }) => {
  const qrCodeRegionId = "qr-reader";

  useEffect(() => {
    // This is a workaround for a potential race condition with the CDN script loading.
    if (!Html5Qrcode) {
        console.error("Html5Qrcode is not defined. The library might not have loaded yet.");
        onScanError("QR Code library failed to load.");
        return;
    }
    
    const html5QrCode = new Html5Qrcode(qrCodeRegionId);
    let isComponentMounted = true;

    const startScanner = async () => {
      try {
        // Find available cameras.
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
            throw new Error("No cameras found on this device.");
        }
        
        // Prefer the back camera ('environment')
        const cameraId = cameras.length > 1 ? cameras[1].id : cameras[0].id;

        await html5QrCode.start(
          cameraId,
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.7);
              return {
                width: qrboxSize,
                height: qrboxSize,
              };
            },
            aspectRatio: 1.0
          },
          (decodedText: string, decodedResult: any) => {
            if (isComponentMounted && html5QrCode.isScanning) {
                // Pause scanning to process the result and prevent rapid re-scans.
                html5QrCode.pause();
                onScanSuccess(decodedText);
                
                // Resume scanning after a delay.
                setTimeout(() => {
                  if (isComponentMounted) {
                    try {
                      html5QrCode.resume();
                    } catch(err) {
                      console.error("Failed to resume QR scanner.", err);
                    }
                  }
                }, 3000); // 3 second delay
            }
          },
          (errorMessage: string) => {
            // This callback is called frequently, e.g., when no QR code is found.
            // We can choose to ignore these messages to avoid spamming errors.
          }
        );

        if (isComponentMounted) {
            onReady();
        }

      } catch (err: any) {
        if (isComponentMounted) {
          console.error("QR Scanner Error:", err);
          onScanError(`Failed to start QR scanner: ${err.message || 'Unknown error'}. Please grant camera permissions and refresh.`);
        }
      }
    };

    startScanner();

    return () => {
      isComponentMounted = false;
      // Cleanup function: stop the scanner when the component unmounts.
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => {
          console.error("Failed to cleanly stop the QR scanner.", err);
        });
      }
    };
  }, [onReady, onScanError, onScanSuccess]);

  return (
    <div className="w-full max-w-md mx-auto relative">
        <div id={qrCodeRegionId} className="border-4 border-slate-600 rounded-lg overflow-hidden aspect-square"></div>
        {/* Visual overlay for scanning area */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[70%] h-[70%] relative">
                {/* Corner brackets */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg transition-all duration-300"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg transition-all duration-300"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg transition-all duration-300"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-cyan-400 rounded-br-lg transition-all duration-300"></div>

                {/* Animated scanning line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400/80 rounded-full shadow-[0_0_10px_theme(colors.cyan.400)] animate-scan-line"></div>
            </div>
        </div>
    </div>
  );
};

export default Scanner;