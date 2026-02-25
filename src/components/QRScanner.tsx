'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, CameraOff, RefreshCw, AlertCircle, CheckCircle, ScanLine } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (memberId: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanned, setScanned] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setPermissionDenied(false);
      setScanned(false);
      getCameras();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices.map(device => ({ id: device.id, label: device.label || `Camera ${device.id}` })));
        // Prefer back camera on mobile devices
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear')
        );
        setSelectedCamera(backCamera?.id || devices[0].id);
      } else {
        setError('No cameras found on this device');
      }
    } catch (err: any) {
      console.error('Error getting cameras:', err);
      if (err.toString().includes('Permission denied') || err.toString().includes('NotAllowedError')) {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else {
        setError('Unable to access camera. Please check your browser permissions.');
      }
    }
  };

  const startScanner = async () => {
    setError(null);
    setScanned(false);

    try {
      // Get fresh list of cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        setError('No cameras found. Please connect a camera and try again.');
        return;
      }

      // Try to find the previously selected camera, or use first available
      let cameraToUse = selectedCamera;
      const cameraExists = devices.some(d => d.id === cameraToUse);
      
      if (!cameraExists) {
        // Camera no longer exists, use first available
        cameraToUse = devices[0].id;
        setSelectedCamera(devices[0].id);
      }

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        cameraToUse,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // QR Code scanned successfully
          setScanned(true);
          setScanning(false);
          stopScanner();
          onScan(decodedText.trim());
          onClose();
        },
        () => {
          // QR code not detected, ignore
        }
      );

      setScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      const errorMsg = err.toString();
      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('not found') || errorMsg.includes('Requested device not found')) {
        setError('Camera not found. Please refresh the page and try again.');
      } else if (errorMsg.includes('NotReadableError') || errorMsg.includes('in use')) {
        setError('Camera is in use by another application. Please close other apps using the camera.');
      } else {
        setError('Failed to start camera. Please try again.');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const switchCamera = (cameraId: string) => {
    setSelectedCamera(cameraId);
    if (scanning) {
      stopScanner().then(() => {
        setTimeout(() => {
          startScanner();
        }, 300);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Scanner Modal */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanLine size={20} className="text-white" />
            <h3 className="text-base font-semibold text-white">Scan QR Code</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Camera Selection */}
          {cameras.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => switchCamera(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner Container */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden mb-4" style={{ minHeight: '300px' }}>
            <div id={scannerContainerId} className="w-full h-full"></div>
            
            {/* Scanning Overlay */}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-4 border-blue-500 rounded-lg animate-pulse"></div>
              </div>
            )}

            {/* Permission Denied State */}
            {permissionDenied && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-4 text-center">
                <CameraOff size={48} className="text-red-500 mb-3" />
                <p className="text-white font-medium mb-2">Camera Access Denied</p>
                <p className="text-gray-400 text-sm mb-4">
                  Please allow camera access in your browser settings to scan QR codes.
                </p>
                <button
                  onClick={() => {
                    setPermissionDenied(false);
                    setError(null);
                    getCameras();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* No Camera State */}
            {!scanning && !permissionDenied && cameras.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-4 text-center">
                <CameraOff size={48} className="text-gray-500 mb-3" />
                <p className="text-white font-medium mb-2">No Camera Found</p>
                <p className="text-gray-400 text-sm">
                  Please connect a camera to scan QR codes.
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && !permissionDenied && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {scanned && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2Circle size={16">
              <CheckCircle className="text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700">QR Code scanned successfully!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!scanning && cameras.length > 0 && (
              <button
                onClick={startScanner}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <Camera size={18} />
                Start Scanning
              </button>
            )}
            
            {scanning && (
              <button
                onClick={stopScanner}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all"
              >
                <CameraOff size={18} />
                Stop Scanning
              </button>
            )}

            {cameras.length > 0 && (
              <button
                onClick={() => {
                  stopScanner();
                  getCameras();
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                title="Refresh cameras"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>

          {/* Instructions */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            Position the QR code on the member's ID card within the frame. 
            The scanner will automatically detect and process the QR code.
          </p>
        </div>
      </div>
    </div>
  );
}
