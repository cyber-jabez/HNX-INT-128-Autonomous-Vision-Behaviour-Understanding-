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

  // Polygon drawing state
  const [drawingPoints, setDrawingPoints] = useState<ZonePoint[]>([]);
  const [mousePos, setMousePos] = useState<ZonePoint | null>(null);

  // Sync external seek
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.4) {
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

  // Draw overlays on canvas
  useEffect(() => {
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw saved zones
    if (showZones) {
      zones.forEach((zone) => {
        if (!zone.polygon || zone.polygon.length < 3) return;

        ctx.beginPath();
        const start = zone.polygon[0];
        ctx.moveTo(start.x * width, start.y * height);
        for (let i = 1; i < zone.polygon.length; i++) {
          const pt = zone.polygon[i];
          ctx.lineTo(pt.x * width, pt.y * height);
        }
        ctx.closePath();

        ctx.fillStyle = `${zone.color}28`;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = zone.color;
        ctx.stroke();
        ctx.setLineDash([]);

        const firstPoint = zone.polygon[0];
        const badgeX = firstPoint.x * width + 6;
        const badgeY = Math.max(16, firstPoint.y * height - 8);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(badgeX - 4, badgeY - 12, ctx.measureText(zone.name).width + 12, 16);
        ctx.fillStyle = zone.color;
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(zone.name, badgeX, badgeY);
      });
    }

    // 2. In-progress zone polygon
    if (isZoneDrawingActive && drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x * width, drawingPoints[0].y * height);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x * width, drawingPoints[i].y * height);
      }
      if (mousePos) ctx.lineTo(mousePos.x * width, mousePos.y * height);
      ctx.strokeStyle = '#C9C2FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      drawingPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#C8EBD8' : '#C9C2FF';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // 3. Draw bounding boxes
    if (showOverlays) {
      tracks.forEach((track) => {
        const [x1, y1, x2, y2] = track.bbox;
        const boxX = x1 * width;
        const boxY = y1 * height;
        const boxW = (x2 - x1) * width;
        const boxH = (y2 - y1) * height;

        const isSelected = selectedTrackId === track.track_id;

        // Pastel behaviour colors
        let boxColor = '#C7DBFF'; // default pastel blue
        if (track.behaviour === 'Running') boxColor = '#FFDCC5'; // peach
        if (track.behaviour === 'Loitering') boxColor = '#F5C8CF'; // rose
        if (track.behaviour === 'Stationary') boxColor = '#F7E7AE'; // yellow
        if (track.behaviour === 'Walking') boxColor = '#C8EBD8'; // mint

        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeStyle = isSelected ? '#C9C2FF' : boxColor;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Corner accents
        const cornerSize = 10;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isSelected ? '#C9C2FF' : '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerSize);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerSize, boxY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(boxX + boxW, boxY + boxH - cornerSize);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW - cornerSize, boxY + boxH);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Label
        const headerText = `#${track.track_id} ${track.class_name} ${(track.confidence * 100).toFixed(0)}%`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        const textWidth = ctx.measureText(headerText).width + 14;
        const badgeH = 20;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(boxX, Math.max(0, boxY - badgeH), textWidth, badgeH);

        ctx.fillStyle = boxColor;
        ctx.fillRect(boxX, Math.max(0, boxY - badgeH), textWidth, 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(headerText, boxX + 6, Math.max(13, boxY - 6));
      });
    }
  }, [tracks, zones, isZoneDrawingActive, drawingPoints, mousePos, showOverlays, showZones, selectedTrackId]);

  // Sync canvas size with video
  const updateCanvasDimensions = useCallback(() => {
    if (videoRef.current && canvasOverlayRef.current) {
      canvasOverlayRef.current.width = videoRef.current.clientWidth;
      canvasOverlayRef.current.height = videoRef.current.clientHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isZoneDrawingActive) {
      if (canvasOverlayRef.current && onSelectTrack) {
        const rect = canvasOverlayRef.current.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        const normY = (e.clientY - rect.top) / rect.height;
        const clickedTrack = tracks.find(
          (t) => normX >= t.bbox[0] && normX <= t.bbox[2] && normY >= t.bbox[1] && normY <= t.bbox[3]
        );
        if (clickedTrack) onSelectTrack(clickedTrack.track_id);
      }
      return;
    }

    if (!canvasOverlayRef.current) return;
    const rect = canvasOverlayRef.current.getBoundingClientRect();
    const point: ZonePoint = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };

    if (drawingPoints.length >= 3) {
      const startPt = drawingPoints[0];
      const dist = Math.hypot(point.x - startPt.x, point.y - startPt.y);
      if (dist < 0.04) {
        completeZonePolygon();
        return;
      }
    }
    setDrawingPoints((prev) => [...prev, point]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isZoneDrawingActive || !canvasOverlayRef.current) return;
    const rect = canvasOverlayRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  const completeZonePolygon = () => {
    if (drawingPoints.length < 3) return;
    let color = '#F5C8CF';
    if (drawingZoneType === 'Machine Area') color = '#FFDCC5';
    if (drawingZoneType === 'Safe Zone') color = '#C8EBD8';
    onZoneCreated({
      name: `${drawingZoneType} ${zones.length + 1}`,
      type: drawingZoneType as any,
      color,
      polygon: drawingPoints,
    });
    setDrawingPoints([]);
    setMousePos(null);
  };

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col bg-black border border-[#E7E7E3] rounded-2xl overflow-hidden shadow-sm group"
    >
      {/* Video + Canvas */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          muted={isMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Overlay Canvas */}
        <canvas
          ref={canvasOverlayRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className={`absolute inset-0 w-full h-full z-10 ${
            isZoneDrawingActive ? 'cursor-crosshair' : 'cursor-default'
          }`}
        />

        {/* Zone Drawing Banner */}
        {isZoneDrawingActive && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-black/70 backdrop-blur-md border border-[#C9C2FF]/30 px-4 py-2.5 rounded-xl text-xs shadow-xl">
            <div className="flex items-center gap-2 text-[#C9C2FF]">
              <span className="w-2 h-2 rounded-full bg-[#C9C2FF] animate-pulse" />
              <span className="font-semibold text-white">Zone Editor Active</span>
              <span>· Click to add vertices. Click near first point to complete.</span>
            </div>
            <div className="flex items-center gap-2">
              {drawingPoints.length >= 3 && (
                <button
                  onClick={completeZonePolygon}
                  className="px-3 py-1 bg-[#C8EBD8] text-[#1B663E] font-semibold rounded-lg text-[11px] hover:bg-[#B3E2C7] transition"
                >
                  Save Zone ({drawingPoints.length} pts)
                </button>
              )}
              <button
                onClick={() => {
                  setDrawingPoints([]);
                  onCancelZoneDrawing();
                }}
                className="px-3 py-1 bg-white/10 text-white/80 rounded-lg text-[11px] hover:bg-white/20 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Live HUD Badge */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded-full text-[11px] font-mono text-white/80">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8EBD8] animate-pulse" />
          <span>VISION AI</span>
          <span className="text-white/40 mx-0.5">·</span>
          <span className="text-[#C9C2FF]">{tracks.length} objects</span>
        </div>
      </div>

      {/* Scrub Bar */}
      <div className="px-4 pt-2.5 pb-0 bg-[#111318]">
        <div className="relative">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            style={{
              background: `linear-gradient(to right, #C9C2FF ${progressPct}%, #2A2D35 ${progressPct}%)`,
            }}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#111318] text-xs border-t border-white/5">
        {/* Left: Play + Time */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
              onTimeUpdate(0);
            }}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="font-mono text-white/70 text-xs px-2 py-1 bg-white/5 rounded-lg border border-white/10">
            {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
          </div>
        </div>

        {/* Center: Overlay Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
              showOverlays
                ? 'bg-[#C9C2FF]/20 border-[#C9C2FF]/30 text-[#C9C2FF]'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            {showOverlays ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>Detections</span>
          </button>
          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
              showZones
                ? 'bg-[#C8EBD8]/20 border-[#C8EBD8]/30 text-[#C8EBD8]'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Zones ({zones.length})</span>
          </button>
        </div>

        {/* Right: Speed, Mute, Fullscreen */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5">
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                  playbackRate === speed
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/10 transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
