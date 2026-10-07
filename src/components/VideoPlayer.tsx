import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Eye,
  EyeOff,
  Layers,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Crosshair,
  Radio,
  Scan
} from 'lucide-react';
import { TrackDetection, Zone, ZonePoint } from '../types';

interface VideoPlayerProps {
  videoUrl: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  tracks: TrackDetection[];
  zones: Zone[];
  isZoneDrawingActive: boolean;
  drawingZoneType: string;
  onZoneCreated: (zone: Omit<Zone, 'id' | 'video_id'>) => void;
  onCancelZoneDrawing: () => void;
  selectedTrackId?: number | null;
  onSelectTrack?: (trackId: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  currentTime,
  onTimeUpdate,
  onDurationChange,
  tracks,
  zones,
  isZoneDrawingActive,
  drawingZoneType,
  onZoneCreated,
  onCancelZoneDrawing,
  selectedTrackId,
  onSelectTrack,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showWeaponHUD, setShowWeaponHUD] = useState(true);

  // Polygon drawing state
  const [drawingPoints, setDrawingPoints] = useState<ZonePoint[]>([]);
  const [mousePos, setMousePos] = useState<ZonePoint | null>(null);

  // Sync external seek
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) onTimeUpdate(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      onDurationChange(videoRef.current.duration);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  // Accurate aspect ratio rect mapping
  const getVideoContentRect = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasOverlayRef.current;
    if (!video || !canvas) return { left: 0, top: 0, width: canvas?.width || 1, height: canvas?.height || 1 };

    const cW = canvas.clientWidth || canvas.width;
    const cH = canvas.clientHeight || canvas.height;
    const videoNativeW = video.videoWidth || 1920;
    const videoNativeH = video.videoHeight || 1080;

    const videoAspect = videoNativeW / videoNativeH;
    const containerAspect = cW / cH;

    let renderW = cW;
    let renderH = cH;
    let offsetLeft = 0;
    let offsetTop = 0;

    if (containerAspect > videoAspect) {
      renderH = cH;
      renderW = renderH * videoAspect;
      offsetLeft = (cW - renderW) / 2;
    } else {
      renderW = cW;
      renderH = renderW / videoAspect;
      offsetTop = (cH - renderH) / 2;
    }

    return { left: offsetLeft, top: offsetTop, width: renderW, height: renderH };
  }, []);

  // Check point in polygon
  const isInsidePoly = (px: number, py: number, poly: ZonePoint[]) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
          (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Find any active restricted intrusions or weapon detections right now
  const activeIntrusions = tracks.filter((t) => {
    const cx = (t.bbox[0] + t.bbox[2]) / 2;
    const cy = (t.bbox[1] + t.bbox[3]) / 2;
    return zones.some((z) => {
      const isRestricted = z.type === 'Restricted Zone' || z.name.toLowerCase().includes('restricted');
      return isRestricted && z.polygon && z.polygon.length >= 3 && isInsidePoly(cx, cy, z.polygon);
    });
  });

  const armedTracks = tracks.filter((t) => t.is_armed || (t.held_object && t.held_object.toLowerCase().includes('gun')));

  // Render Overlays
  useEffect(() => {
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const vRect = getVideoContentRect();
    const { left: offX, top: offY, width: vW, height: vH } = vRect;

    // 1. Draw Zones
    if (showZones) {
      zones.forEach((zone) => {
        if (!zone.polygon || zone.polygon.length < 3) return;

        ctx.beginPath();
        const start = zone.polygon[0];
        ctx.moveTo(offX + start.x * vW, offY + start.y * vH);
        for (let i = 1; i < zone.polygon.length; i++) {
          const pt = zone.polygon[i];
          ctx.lineTo(offX + pt.x * vW, offY + pt.y * vH);
        }
        ctx.closePath();

        // Delicate filled mesh
        ctx.fillStyle = `${zone.color}25`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = zone.color;
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone Tag
        const firstPoint = zone.polygon[0];
        const badgeX = offX + firstPoint.x * vW + 8;
        const badgeY = Math.max(20, offY + firstPoint.y * vH - 6);

        ctx.fillStyle = 'rgba(17, 24, 39, 0.9)';
        ctx.beginPath();
        ctx.roundRect(badgeX - 4, badgeY - 14, ctx.measureText(zone.name).width + 16, 20, 6);
        ctx.fill();

        ctx.fillStyle = zone.color;
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(zone.name, badgeX + 4, badgeY);
      });
    }

    // 2. Active polygon being drawn
    if (isZoneDrawingActive && drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(offX + drawingPoints[0].x * vW, offY + drawingPoints[0].y * vH);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(offX + drawingPoints[i].x * vW, offY + drawingPoints[i].y * vH);
      }
      if (mousePos) ctx.lineTo(offX + mousePos.x * vW, offY + mousePos.y * vH);
      ctx.strokeStyle = '#4F46E5';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawingPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(offX + pt.x * vW, offY + pt.y * vH, 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#10B981' : '#6366F1';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // 3. Draw Detections, Person Tracking & Weapon HUD
    if (showOverlays) {
      tracks.forEach((track) => {
        const [x1, y1, x2, y2] = track.bbox;
        const boxX = offX + x1 * vW;
        const boxY = offY + y1 * vH;
        const boxW = (x2 - x1) * vW;
        const boxH = (y2 - y1) * vH;

        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const intrudedZone = zones.find((z) => {
          const isRestricted = z.type === 'Restricted Zone' || z.name.toLowerCase().includes('restricted');
          return isRestricted && z.polygon && z.polygon.length >= 3 && isInsidePoly(centerX, centerY, z.polygon);
        });

        const isArmed = track.is_armed || (track.held_object && track.held_object.toLowerCase().includes('gun'));
        const hasHeldObject = !!track.held_object;
        const isSelected = selectedTrackId === track.track_id;

        // Determine border and accent styling
        let strokeColor = '#3B82F6'; // Default Clean Blue
        let fillColor = 'rgba(59, 130, 246, 0.04)';

        if (track.behaviour === 'Running') {
          strokeColor = '#F97316';
        } else if (track.behaviour === 'Loitering') {
          strokeColor = '#EC4899';
        } else if (track.behaviour === 'Stationary') {
          strokeColor = '#EAB308';
        }

        if (intrudedZone) {
          strokeColor = '#DC2626'; // High Alert Crimson
          fillColor = 'rgba(220, 38, 38, 0.16)';
        }

        if (isArmed) {
          strokeColor = '#B91C1C'; // Danger Threat Red
          fillColor = 'rgba(185, 28, 28, 0.22)';
        }

        ctx.strokeStyle = isSelected ? '#4F46E5' : strokeColor;
        ctx.lineWidth = isArmed || intrudedZone ? 2.8 : (isSelected ? 2.5 : 1.75);

        // Box & Soft Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Crisp Corner Brackets
        const cornerLen = Math.min(14, boxW * 0.25, boxH * 0.25);
        ctx.strokeStyle = isArmed ? '#EF4444' : (intrudedZone ? '#DC2626' : (isSelected ? '#4F46E5' : '#FFFFFF'));
        ctx.lineWidth = 2.5;

        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerLen);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerLen, boxY);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(boxX + boxW, boxY + boxH - cornerLen);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW - cornerLen, boxY + boxH);
        ctx.stroke();

        // Header Tag Badge
        let badgeTitle = `#${track.track_id} ${track.class_name}`;
        if (intrudedZone) badgeTitle = `⚠ RESTRICTED #${track.track_id}`;
        if (isArmed) badgeTitle = `🚨 ARMED: ${track.held_object?.toUpperCase() || 'WEAPON'}`;

        ctx.font = 'bold 11px system-ui, sans-serif';
        const badgeWidth = ctx.measureText(badgeTitle).width + 18;
        const badgeHeight = 22;
        const badgeYPos = Math.max(0, boxY - badgeHeight - 2);

        ctx.fillStyle = isArmed
          ? '#991B1B'
          : (intrudedZone ? '#B91C1C' : '#0F172A');
        ctx.beginPath();
        ctx.roundRect(boxX, badgeYPos, badgeWidth, badgeHeight, 5);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(badgeTitle, boxX + 8, badgeYPos + 15);

        // Handheld Object / Gun Micro Target Badge
        if (showWeaponHUD && (hasHeldObject || isArmed)) {
          const handX = boxX + boxW * 0.65;
          const handY = boxY + boxH * 0.52;

          // Target reticle near person's hand
          ctx.strokeStyle = isArmed ? '#EF4444' : '#F59E0B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(handX, handY, 12, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = isArmed ? 'rgba(239, 68, 68, 0.95)' : 'rgba(217, 119, 6, 0.95)';
          const handTag = `✋ ${track.held_object || 'OBJECT'}`;
          ctx.font = 'bold 10px system-ui, sans-serif';
          const handTagWidth = ctx.measureText(handTag).width + 12;

          ctx.beginPath();
          ctx.roundRect(handX + 16, handY - 10, handTagWidth, 20, 4);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(handTag, handX + 22, handY + 4);
        }
      });
    }
  }, [
    tracks,
    zones,
    isZoneDrawingActive,
    drawingPoints,
    mousePos,
    showOverlays,
    showZones,
    showWeaponHUD,
    selectedTrackId,
    getVideoContentRect,
  ]);

  // Canvas size sync
  const updateCanvasDimensions = useCallback(() => {
    if (containerRef.current && canvasOverlayRef.current) {
      canvasOverlayRef.current.width = containerRef.current.clientWidth;
      canvasOverlayRef.current.height = containerRef.current.clientHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateCanvasDimensions);
    const timer = setTimeout(updateCanvasDimensions, 150);
    return () => {
      window.removeEventListener('resize', updateCanvasDimensions);
      clearTimeout(timer);
    };
  }, [updateCanvasDimensions]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = getVideoContentRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (!isZoneDrawingActive) {
      if (canvasOverlayRef.current && onSelectTrack) {
        const cRect = canvasOverlayRef.current.getBoundingClientRect();
        const clickX = e.clientX - cRect.left;
        const clickY = e.clientY - cRect.top;
        const normX = (clickX - rect.left) / rect.width;
        const normY = (clickY - rect.top) / rect.height;
        const clickedTrack = tracks.find(
          (t) => normX >= t.bbox[0] && normX <= t.bbox[2] && normY >= t.bbox[1] && normY <= t.bbox[3]
        );
        if (clickedTrack) onSelectTrack(clickedTrack.track_id);
      }
      return;
    }

    const cRect = canvasOverlayRef.current?.getBoundingClientRect();
    if (!cRect) return;
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;
    const normX = Math.max(0, Math.min(1, (clickX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clickY - rect.top) / rect.height));

    if (drawingPoints.length >= 2) {
      const first = drawingPoints[0];
      const dist = Math.hypot(normX - first.x, normY - first.y);
      if (dist < 0.04) {
        // Complete polygon
        const finalPolygon = [...drawingPoints];
        let color = '#3B82F6';
        if (drawingZoneType === 'Restricted Zone') color = '#EF4444';
        else if (drawingZoneType === 'Machine Area') color = '#F59E0B';
        else if (drawingZoneType === 'Safe Zone') color = '#10B981';

        onZoneCreated({
          name: `${drawingZoneType} ${zones.length + 1}`,
          color,
          polygon: finalPolygon,
          type: drawingZoneType as any,
        });
        setDrawingPoints([]);
        setMousePos(null);
        return;
      }
    }

    setDrawingPoints((prev) => [...prev, { x: normX, y: normY }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isZoneDrawingActive || drawingPoints.length === 0) return;
    const rect = getVideoContentRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const cRect = canvasOverlayRef.current?.getBoundingClientRect();
    if (!cRect) return;
    const clickX = e.clientX - cRect.left;
    const clickY = e.clientY - cRect.top;
    const normX = Math.max(0, Math.min(1, (clickX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clickY - rect.top) / rect.height));

    setMousePos({ x: normX, y: normY });
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#EDEDEA] rounded-2xl shadow-xs overflow-hidden flex flex-col transition-all">
      {/* Real-time Threat Alarms Banner */}
      {armedTracks.length > 0 && (
        <div className="bg-[#FFF1F2] border-b border-[#FEE2E2] px-4 py-2 flex items-center justify-between text-xs text-[#BE123C] font-semibold animate-threat-alert">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#E11D48] animate-bounce" />
            <span>CRITICAL ALERT: Gun / Weapon detected in person's hand ({armedTracks.map(t => `#${t.track_id}`).join(', ')})</span>
          </div>
          <span className="text-[11px] font-mono bg-[#FFE4E6] px-2 py-0.5 rounded border border-[#FECDD3]">
            HIGH RISK
          </span>
        </div>
      )}

      {activeIntrusions.length > 0 && armedTracks.length === 0 && (
        <div className="bg-[#FFF7ED] border-b border-[#FFEDD5] px-4 py-2 flex items-center justify-between text-xs text-[#C2410C] font-semibold">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#EA580C] animate-pulse" />
            <span>RESTRICTED PERIMETER INTRUSION: Entity inside protected polygon</span>
          </div>
          <span className="text-[11px] font-mono bg-[#FFEDD5] px-2 py-0.5 rounded">
            ZONE BREACH
          </span>
        </div>
      )}

      {/* Video Viewport Container */}
      <div
        ref={containerRef}
        className="relative w-full bg-[#0F172A] flex items-center justify-center overflow-hidden min-h-[380px] md:min-h-[460px] lg:min-h-[520px] max-h-[72vh] select-none"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full max-h-[72vh] object-contain"
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onClick={togglePlay}
        />

        <canvas
          ref={canvasOverlayRef}
          className={`absolute inset-0 w-full h-full ${
            isZoneDrawingActive ? 'cursor-crosshair' : 'cursor-default'
          }`}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        />

        {/* Live Video Watermark / Metadata HUD */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0F172A]/80 backdrop-blur-md border border-white/10 rounded-lg text-[11px] text-white font-mono">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="font-semibold text-white">LIVE REC</span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#0F172A]/80 backdrop-blur-md border border-white/10 rounded-lg text-[11px] text-white/90">
            <Crosshair className="w-3 h-3 text-[#38BDF8]" />
            <span>{tracks.length} Entities</span>
          </div>
        </div>

        {/* HUD Quick Toggles */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={() => setShowWeaponHUD(!showWeaponHUD)}
            title="Toggle Weapon & Handheld Object HUD"
            className={`p-1.5 rounded-lg text-xs backdrop-blur-md border transition ${
              showWeaponHUD
                ? 'bg-[#EF4444]/80 border-[#EF4444] text-white'
                : 'bg-[#0F172A]/70 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            title="Toggle Bounding Boxes"
            className={`p-1.5 rounded-lg text-xs backdrop-blur-md border transition ${
              showOverlays
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-[#0F172A]/70 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowZones(!showZones)}
            title="Toggle Zones"
            className={`p-1.5 rounded-lg text-xs backdrop-blur-md border transition ${
              showZones
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-[#0F172A]/70 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zone Drawing Prompt */}
        {isZoneDrawingActive && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#111827]/90 backdrop-blur-md border border-white/20 rounded-xl text-xs text-white flex items-center gap-3 shadow-xl">
            <span>Click to add perimeter vertices ({drawingPoints.length} added). Close loop on first point.</span>
            <button
              onClick={onCancelZoneDrawing}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-semibold transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Modern Executive Player Controls Bar */}
      <div className="p-3 sm:p-4 bg-[#FFFFFF] border-t border-[#EDEDEA] flex flex-col gap-3">
        {/* Scrubber Range Bar */}
        <div className="w-full flex items-center gap-3">
          <span className="font-mono text-xs text-[#6B7280] font-medium shrink-0">
            {formatSeconds(currentTime)}
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.05}
              value={currentTime}
              onChange={handleSeek}
              className="w-full"
            />
          </div>
          <span className="font-mono text-xs text-[#9CA3AF] font-medium shrink-0">
            {formatSeconds(duration)}
          </span>
        </div>

        {/* Playback Controls & Utility Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-[#111827] hover:bg-[#000000] text-white transition shadow-xs active:scale-95 flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  onTimeUpdate(0);
                }
              }}
              className="p-2 rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F5F3] transition"
              title="Restart Video"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (videoRef.current) videoRef.current.muted = !isMuted;
              }}
              className="p-2 rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F5F3] transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Playback Speeds */}
            <div className="hidden sm:flex items-center gap-1 bg-[#F5F5F3] p-0.5 rounded-xl border border-[#EDEDEA] text-xs">
              {[0.5, 1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2 py-0.5 rounded-lg font-mono text-[11px] transition ${
                    playbackRate === spd
                      ? 'bg-white font-semibold text-[#111827] shadow-xs'
                      : 'text-[#6B7280] hover:text-[#111827]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-[#6B7280] hover:text-[#111827] hover:bg-[#F5F5F3] transition"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
