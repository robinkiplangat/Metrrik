
import React, { useRef, useEffect, useState } from 'react';
import type { UploadedFile } from '../../types';
import Icon from '../ui/Icon';

interface VisualPlanEditorProps {
    file: UploadedFile;
    onClose: () => void;
    onSave: (dataUrl: string) => void;
}

type Tool = 'rect' | 'text';

const VisualPlanEditor: React.FC<VisualPlanEditorProps> = ({ file, onClose, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
    const [tool, setTool] = useState<Tool>('rect');
    const [color, setColor] = useState('#EF5350'); // A reddish color

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        setContext(ctx);

        const image = new Image();
        image.src = `data:${file.type};base64,${file.base64}`;
        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            ctx?.drawImage(image, 0, 0);
        };
    }, [file]);

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!context) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const scaleX = canvasRef.current!.width / rect.width;
        const scaleY = canvasRef.current!.height / rect.height;

        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        if (tool === 'rect') {
            context.strokeStyle = color;
            context.lineWidth = 4;
            context.strokeRect(x - 50, y - 25, 100, 50);
        } else if (tool === 'text') {
            const text = prompt('Enter text to add:');
            if (text) {
                context.fillStyle = color;
                context.font = '24px Arial';
                context.fillText(text, x, y);
            }
        }
    };
    
    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL(file.type));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50 p-4">
            <div className="w-full max-w-5xl bg-gray-800 p-3 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setTool('rect')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${tool === 'rect' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <span>Rectangle</span>
                    </button>
                    <button onClick={() => setTool('text')} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${tool === 'text' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <span>Text</span>
                    </button>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded border-none bg-gray-700 cursor-pointer" />
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-[#29B6F6] text-white rounded-lg hover:bg-[#039BE5]">Save Annotations</button>
                </div>
            </div>
            <div className="w-full max-w-5xl flex-1 bg-gray-900 overflow-auto flex items-center justify-center rounded-b-xl">
                 <canvas ref={canvasRef} onClick={handleCanvasClick} className="max-w-full max-h-full" style={{cursor: 'crosshair'}} />
            </div>
        </div>
    );
};

export default VisualPlanEditor;
