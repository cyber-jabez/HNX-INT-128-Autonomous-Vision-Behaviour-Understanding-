import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Gauge,
  Sliders,
  Eye,
  EyeOff,
  ShieldAlert,
  Layers,
  Sparkles
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

  // Sync external seek with video element
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
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      onDurationChange(videoRef.current.duration);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
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

  // Render Overlays (Bounding Boxes, Track IDs, Behaviours, and Zones)
  useEffect(() => {
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Saved Polygon Zones
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

        // Fill with subtle translucent shade
        ctx.fillStyle = `${zone.color}33`; // 20% opacity
        ctx.fill();

        // Stroke border
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = zone.color;
        ctx.stroke();
        ctx.setLineDash([]);

        // Zone label badge
        const firstPoint = zone.polygon[0];
        const badgeX = firstPoint.x * width + 6;
        const badgeY = Math.max(16, firstPoint.y * height - 8);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(badgeX - 4, badgeY - 12, ctx.measureText(zone.name).width + 12, 16);
        ctx.fillStyle = zone.color;
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.fillText(zone.name, badgeX, badgeY);
      });
    }

    // 2. Draw Currently In-progress Polygon
    if (isZoneDrawingActive && drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x * width, drawingPoints[0].y * height);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x * width, drawingPoints[i].y * height);
      }
      if (mousePos) {
        ctx.lineTo(mousePos.x * width, mousePos.y * height);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw vertex handles
      drawingPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x * width, pt.y * height, 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#10b981' : '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    // 3. Draw Tracked Detections (Bounding Boxes & Behaviour Indicators)
    if (showOverlays) {
      tracks.forEach((track) => {
        const [x1, y1, x2, y2] = track.bbox;
        const boxX = x1 * width;
        const boxY = y1 * height;
        const boxW = (x2 - x1) * width;
        const boxH = (y2 - y1) * height;

        const isSelected = selectedTrackId === track.track_id;

        // Behaviour-dependent styling
        let badgeColor = '#3b82f6'; // default blue
        if (track.behaviour === 'Running') badgeColor = '#f59e0b';
        if (track.behaviour === 'Loitering') badgeColor = '#ec4899';
        if (track.behaviour === 'Stationary') badgeColor = '#ef4444';
        if (track.behaviour === 'Walking') badgeColor = '#10b981';

        // Draw Bounding Box with corner highlights
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = isSelected ? '#a855f7' : badgeColor;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Highlight corners
        const cornerSize = 10;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        // top-left
        ctx.beginPath();
        ctx.moveTo(boxX, boxY + cornerSize);
        ctx.lineTo(boxX, boxY);
        ctx.lineTo(boxX + cornerSize, boxY);
        ctx.stroke();
        // bottom-right
        ctx.beginPath();
        ctx.moveTo(boxX + boxW, boxY + boxH - cornerSize);
        ctx.lineTo(boxX + boxW, boxY + boxH);
        ctx.lineTo(boxX + boxW - cornerSize, boxY + boxH);
        ctx.stroke();

        // Label info: "Track #ID • Class (Conf%)"
        const headerText = `ID #${track.track_id} • ${track.class_name} ${(track.confidence * 100).toFixed(0)}%`;
        const behaviourText = `● ${track.behaviour.toUpperCase()}`;

        ctx.font = 'bold 11px system-ui, sans-serif';
        const textWidth = Math.max(ctx.measureText(headerText).width, ctx.measureText(behaviourText).width) + 12;

        // Header Background
        const badgeHeight = 32;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(boxX, Math.max(0, boxY - badgeHeight), textWidth, badgeHeight);

        // Header Border Top
        ctx.fillStyle = badgeColor;
        ctx.fillRect(boxX, Math.max(0, boxY - badgeHeight), textWidth, 2);

        // Text: ID and Confidence
        ctx.fillStyle = '#ffffff';
        ctx.fillText(headerText, boxX + 6, Math.max(12, boxY - 18));

        // Text: Behaviour State
        ctx.fillStyle = badgeColor;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(behaviourText, boxX + 6, Math.max(24, boxY - 6));
      });
    }
  }, [tracks, zones, isZoneDrawingActive, drawingPoints, mousePos, showOverlays, showZones, selectedTrackId]);

  // Sync canvas size with video client dimensions
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

  // Handle Canvas Polygon Click & Mouse Move
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isZoneDrawingActive) {
      // Check if user clicked on a detection box to select track
      if (canvasOverlayRef.current && onSelectTrack) {
        const rect = canvasOverlayRef.current.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width;
        const normY = (e.clientY - rect.top) / rect.height;

        const clickedTrack = tracks.find(
          (t) =>
            normX >= t.bbox[0] &&
            normX <= t.bbox[2] &&
            normY >= t.bbox[1] &&
            normY <= t.bbox[3]
        );
        if (clickedTrack) {
          onSelectTrack(clickedTrack.track_id);
        }
      }
      return;
    }

    if (!canvasOverlayRef.current) return;
    const rect = canvasOverlayRef.current.getBoundingClientRect();
    const point: ZonePoint = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };

    // If clicking close to starting point (and has at least 3 points), close polygon
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

    let color = '#ef4444';
    if (drawingZoneType === 'Machine Area') color = '#f59e0b';
    if (drawingZoneType === 'Safe Zone') color = '#10b981';

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

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col bg-[#0b0f19] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl group"
    >
      {/* Video Stream + Overlay Canvas */}
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

        {/* Overlay Canvas for Real-time Bounding Boxes and Zones */}
        <canvas
          ref={canvasOverlayRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className={`absolute inset-0 w-full h-full z-10 ${
            isZoneDrawingActive ? 'cursor-crosshair' : 'cursor-default'
          }`}
        />

        {/* Zone Drawing Guide Banner */}
        {isZoneDrawingActive && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between bg-slate-900/90 border border-indigo-500/50 backdrop-blur-md px-4 py-2.5 rounded-xl text-xs shadow-xl animate-in fade-in">
            <div className="flex items-center space-x-2 text-indigo-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
              <span className="font-semibold text-white">Zone Editor Active:</span>
              <span>Click to add polygon vertices. Click near starting node (green) to complete zone.</span>
            </div>
            <div className="flex items-center gap-2">
              {drawingPoints.length >= 3 && (
                <button
                  onClick={completeZonePolygon}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition"
                >
                  Save Zone ({drawingPoints.length} pts)
                </button>
              )}
              <button
                onClick={() => {
                  setDrawingPoints([]);
                  onCancelZoneDrawing();
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Live HUD Watermark / Status */}
        <div className="absolute top-3 right-3 z-10 flex items-center space-x-2 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>VISION AI ACTIVE</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">{tracks.length} OBJECTS</span>
        </div>
      </div>

      {/* Scrub Bar */}
      <div className="px-4 pt-3 pb-1 bg-[#0d1322] border-t border-slate-800/80">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.05}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition"
        />
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#0d1322] text-slate-300 text-xs">
        {/* Left: Playback controls & Time */}
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 shadow-md shadow-indigo-600/30"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
              onTimeUpdate(0);
            }}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-slate-200 font-medium px-2 py-1 bg-slate-900 rounded border border-slate-800">
            {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
          </div>
        </div>

        {/* Center: Overlays Toggle & Zones Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
              showOverlays
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800/40 border-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            {showOverlays ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Detections</span>
          </button>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition ${
              showZones
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/40 border-slate-750 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zones ({zones.length})</span>
          </button>
        </div>

        {/* Right: Playback Speed, Mute, Fullscreen */}
        <div className="flex items-center space-x-2">
          {/* Speed selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  playbackRate === speed
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
