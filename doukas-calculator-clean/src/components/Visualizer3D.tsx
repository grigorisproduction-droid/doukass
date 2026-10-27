import React, { useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Visualizer3DProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Array<{
    id: number;
    category: string;
    section: string;
    dimensions: string;
    quantity: number;
    weight: number;
  }>;
}

export default function Visualizer3D({ isOpen, onClose, materials }: Visualizer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);

  useEffect(() => {
    if (!isOpen || !canvasRef.current || materials.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw materials as 3D-ish boxes
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const spacing = 120;

    materials.forEach((item, index) => {
      const x = centerX + (index - materials.length / 2) * spacing * zoom;
      const y = centerY;

      // Color based on index
      const hue = (index * 60) % 360;
      const color = `hsl(${hue}, 70%, 50%)`;
      const darkColor = `hsl(${hue}, 70%, 35%)`;

      // Apply rotation (simplified)
      const angle = rotation * Math.PI / 180;
      const width = 80 * zoom;
      const height = 100 * zoom;
      const depth = 60 * zoom;

      // Draw 3D-like box
      ctx.save();
      ctx.translate(x, y);

      // Top face
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -height / 2);
      ctx.lineTo(depth * Math.cos(angle), -height / 2 - depth * Math.sin(angle));
      ctx.lineTo(depth * Math.cos(angle) + width, -height / 2 - depth * Math.sin(angle));
      ctx.lineTo(width, -height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Front face
      ctx.fillStyle = darkColor;
      ctx.fillRect(-width / 2, -height / 2, width, height);
      ctx.strokeRect(-width / 2, -height / 2, width, height);

      // Side face
      ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
      ctx.beginPath();
      ctx.moveTo(width / 2, -height / 2);
      ctx.lineTo(width / 2 + depth * Math.cos(angle), -height / 2 + depth * Math.sin(angle));
      ctx.lineTo(width / 2 + depth * Math.cos(angle), height / 2 + depth * Math.sin(angle));
      ctx.lineTo(width / 2, height / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.quantity}x`, 0, 0);
      ctx.font = '10px sans-serif';
      ctx.fillText(item.section, 0, 15);

      ctx.restore();
    });

    // Draw info
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Υλικά: ${materials.length}`, 20, 30);
    ctx.fillText(`Συνολικό Βάρος: ${materials.reduce((sum, m) => sum + m.weight, 0).toFixed(2)} kg`, 20, 50);

  }, [isOpen, materials, rotation, zoom]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎮</span>
            <div>
              <h3 className="text-lg font-bold">3D Προεπισκόπηση</h3>
              <p className="text-xs opacity-90">{materials.length} υλικά - {materials.reduce((sum, m) => sum + m.weight, 0).toFixed(2)} kg</p>
            </div>
          </div>
          <button 
            className="text-white/80 hover:text-white text-2xl"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          {materials.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500">
                <span className="text-6xl block mb-4">📦</span>
                <p className="text-lg font-semibold">Δεν υπάρχουν υλικά για προεπισκόπηση</p>
                <p className="text-sm mt-2">Πρόσθεσε υλικά στη λίστα πρώτα!</p>
              </div>
            </div>
          ) : (
            <>
              <canvas 
                ref={canvasRef}
                className="w-full h-full rounded-lg shadow-inner bg-white"
                style={{ minHeight: '400px' }}
              />
              
              {/* Controls */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-4 shadow-lg space-y-3 w-64">
                <div className="text-sm font-semibold text-slate-700 mb-2">Έλεγχοι</div>
                
                {/* Rotation */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 flex justify-between">
                    <span>Περιστροφή</span>
                    <span className="font-mono">{rotation}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="10"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Zoom */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 flex justify-between">
                    <span>Zoom</span>
                    <span className="font-mono">{zoom.toFixed(1)}x</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                      className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}
                      className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => {
                    setRotation(0);
                    setZoom(1);
                  }}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCw size={16} /> Reset
                </button>
              </div>

              {/* Legend */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg max-w-xs max-h-96 overflow-y-auto">
                <div className="text-sm font-semibold text-slate-700 mb-2">Υλικά</div>
                <div className="space-y-1.5">
                  {materials.map((item, index) => {
                    const hue = (index * 60) % 360;
                    const color = `hsl(${hue}, 70%, 50%)`;
                    return (
                      <div key={item.id} className="flex items-start gap-2 text-xs">
                        <div 
                          className="w-4 h-4 rounded flex-shrink-0 mt-0.5 border border-slate-300"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{item.category}</div>
                          <div className="text-slate-600">{item.section} - {item.quantity}τμχ</div>
                          <div className="text-slate-500">{item.weight.toFixed(2)} kg</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            💡 Χρησιμοποίησε τα sliders για να περιστρέψεις και να κάνεις zoom
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
