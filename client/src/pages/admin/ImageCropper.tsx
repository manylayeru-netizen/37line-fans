import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image } from '@client/src/components/ui/image';

export interface CropValues {
  thumbX: number;
  thumbY: number;
  thumbW: number;
  thumbH: number;
}

interface ImageCropperProps {
  imageUrl: string;
  value: CropValues;
  onChange: (v: CropValues) => void;
  maxWidth?: number;
}

type DragMode =
  | { type: 'move'; startX: number; startY: number; origX: number; origY: number }
  | {
      type: 'resize';
      corner: 'nw' | 'ne' | 'sw' | 'se';
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
    }
  | null;

const MIN_SIZE_PCT = 5;

const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUrl,
  value,
  onChange,
  maxWidth = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<DragMode>(null);

  // 计算图片在容器内的显示尺寸（contain 模式）
  const computeDisplaySize = useCallback(() => {
    if (!imgNaturalSize.w || !imgNaturalSize.h) return;
    const container = containerRef.current;
    if (!container) return;
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    const ratio = Math.min(availW / imgNaturalSize.w, availH / imgNaturalSize.h);
    setDisplaySize({
      w: imgNaturalSize.w * ratio,
      h: imgNaturalSize.h * ratio,
    });
  }, [imgNaturalSize]);

  useEffect(() => {
    computeDisplaySize();
  }, [computeDisplaySize, maxWidth]);

  useEffect(() => {
    const handleResize = () => computeDisplaySize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [computeDisplaySize]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setImgLoaded(true);
  };

  useEffect(() => {
    if (imgLoaded) {
      // 下一帧计算，保证容器尺寸已确定
      requestAnimationFrame(() => computeDisplaySize());
    }
  }, [imgLoaded, computeDisplaySize]);

  // 将像素坐标转换为百分比（相对图片显示尺寸）
  const pxToPct = (pxX: number, pxY: number): { x: number; y: number } => {
    if (!displaySize.w || !displaySize.h) return { x: 0, y: 0 };
    return {
      x: (pxX / displaySize.w) * 100,
      y: (pxY / displaySize.h) * 100,
    };
  };

  // 获取相对于图片显示区域的鼠标/触摸坐标
  const getRelativePos = (clientX: number, clientY: number): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container || !displaySize.w) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    // 图片在容器内居中
    const imgLeft = rect.left + (rect.width - displaySize.w) / 2;
    const imgTop = rect.top + (rect.height - displaySize.h) / 2;
    return {
      x: clientX - imgLeft,
      y: clientY - imgTop,
    };
  };

  const clamp = (v: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, v));

  const handleDragStart = (clientX: number, clientY: number, mode: DragMode) => {
    dragRef.current = mode;
    // 使用 preventDefault 在触摸时阻止滚动
    void clientX;
    void clientY;
  };

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;

      const pos = getRelativePos(clientX, clientY);
      const delta = pxToPct(pos.x - drag.startX, pos.y - drag.startY);

      if (drag.type === 'move') {
        const newX = clamp(drag.origX + delta.x, 0, 100 - value.thumbW);
        const newY = clamp(drag.origY + delta.y, 0, 100 - value.thumbH);
        onChange({
          ...value,
          thumbX: Math.round(newX),
          thumbY: Math.round(newY),
        });
      } else if (drag.type === 'resize') {
        // 保持 1:1 比例，以宽度变化为基准，高度同步
        let dW = delta.x;
        let dH = delta.y;
        // 统一按绝对值较大的方向缩放，保持正方形
        const deltaMag = Math.abs(dW) >= Math.abs(dH) ? dW : dH * (drag.origW / drag.origH || 1);

        let newW = drag.origW;
        let newH = drag.origH;
        let newX = drag.origX;
        let newY = drag.origY;

        const corner = drag.corner;
        if (corner === 'se') {
          // 右下角：宽高变化，x/y 不变
          const sizeDelta = deltaMag;
          const newSize = clamp(drag.origW + sizeDelta, MIN_SIZE_PCT, 100 - drag.origX);
          newW = newSize;
          newH = newSize;
        } else if (corner === 'nw') {
          // 左上角：x/y 和宽高都变
          const sizeDelta = -deltaMag;
          const maxDeltaX = drag.origW - MIN_SIZE_PCT;
          const maxDeltaY = drag.origH - MIN_SIZE_PCT;
          const actualDelta = clamp(sizeDelta, -maxDeltaX, 100 - drag.origW);
          // 因为要保持 x+w 不变，x 变化 = -size 变化
          const newSize = drag.origW + actualDelta;
          newX = drag.origX - actualDelta;
          newY = drag.origY - actualDelta;
          newW = newSize;
          newH = newSize;
        } else if (corner === 'ne') {
          // 右上角：y 和宽高变，x 不变
          const sizeDelta = delta.x;
          const newSize = clamp(drag.origW + sizeDelta, MIN_SIZE_PCT, 100 - drag.origX);
          const actualDelta = newSize - drag.origW;
          newW = newSize;
          newH = newSize;
          newY = drag.origY - actualDelta;
        } else if (corner === 'sw') {
          // 左下角：x 和宽高变，y 不变
          const sizeDelta = -delta.x;
          const maxDeltaX = drag.origW - MIN_SIZE_PCT;
          const actualDelta = clamp(sizeDelta, -maxDeltaX, 100 - drag.origW);
          const newSize = drag.origW + actualDelta;
          newX = drag.origX - actualDelta;
          newW = newSize;
          newH = newSize;
        }

        // 边界修正
        newX = clamp(newX, 0, 100 - newW);
        newY = clamp(newY, 0, 100 - newH);
        if (newX + newW > 100) newW = 100 - newX;
        if (newY + newH > 100) newH = 100 - newY;

        onChange({
          thumbX: Math.round(newX),
          thumbY: Math.round(newY),
          thumbW: Math.round(newW),
          thumbH: Math.round(newH),
        });
      }
    },
    [value, onChange],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  // 全局事件监听
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      handleDragMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handleDragEnd();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // 选框样式（百分比定位，相对图片显示尺寸）
  const cropStyle: React.CSSProperties = {
    left: `${value.thumbX}%`,
    top: `${value.thumbY}%`,
    width: `${value.thumbW}%`,
    height: `${value.thumbH}%`,
  };

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full bg-grid/30 rounded-lg flex items-center justify-center select-none"
        style={{
          maxWidth,
          aspectRatio: '4 / 3',
          touchAction: 'none',
        }}
      >
        {imgLoaded && displaySize.w > 0 && (
          <div
            className="relative"
            style={{
              width: displaySize.w,
              height: displaySize.h,
            }}
          >
            <Image
              ref={imgRef}
              src={imageUrl}
              alt="裁剪预览"
              className="block pointer-events-none"
              style={{ width: '100%', height: '100%' }}
              draggable={false}
            />

            {/* 四周遮罩 */}
            {/* 上 */}
            <div
              className="absolute left-0 right-0 bg-black/40 pointer-events-none"
              style={{ top: 0, height: `${value.thumbY}%` }}
            />
            {/* 下 */}
            <div
              className="absolute left-0 right-0 bg-black/40 pointer-events-none"
              style={{ bottom: 0, height: `${100 - value.thumbY - value.thumbH}%` }}
            />
            {/* 左 */}
            <div
              className="absolute bg-black/40 pointer-events-none"
              style={{
                top: `${value.thumbY}%`,
                left: 0,
                width: `${value.thumbX}%`,
                height: `${value.thumbH}%`,
              }}
            />
            {/* 右 */}
            <div
              className="absolute bg-black/40 pointer-events-none"
              style={{
                top: `${value.thumbY}%`,
                right: 0,
                width: `${100 - value.thumbX - value.thumbW}%`,
                height: `${value.thumbH}%`,
              }}
            />

            {/* 选框 */}
            <div
              className="absolute cursor-move"
              style={{
                ...cropStyle,
                border: '2px dashed #F4A261',
                boxSizing: 'border-box',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.5) inset',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                const pos = getRelativePos(e.clientX, e.clientY);
                handleDragStart(e.clientX, e.clientY, {
                  type: 'move',
                  startX: pos.x,
                  startY: pos.y,
                  origX: value.thumbX,
                  origY: value.thumbY,
                });
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                const pos = getRelativePos(touch.clientX, touch.clientY);
                handleDragStart(touch.clientX, touch.clientY, {
                  type: 'move',
                  startX: pos.x,
                  startY: pos.y,
                  origX: value.thumbX,
                  origY: value.thumbY,
                });
              }}
            >
              {/* 四角 resize handle */}
              {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                const posStyle: React.CSSProperties =
                  corner === 'nw'
                    ? { top: -6, left: -6, cursor: 'nwse-resize' }
                    : corner === 'ne'
                      ? { top: -6, right: -6, cursor: 'nesw-resize' }
                      : corner === 'sw'
                        ? { bottom: -6, left: -6, cursor: 'nesw-resize' }
                        : { bottom: -6, right: -6, cursor: 'nwse-resize' };
                return (
                  <div
                    key={corner}
                    className="absolute w-3 h-3 bg-shiba border-2 border-white rounded-full"
                    style={posStyle}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const pos = getRelativePos(e.clientX, e.clientY);
                      dragRef.current = {
                        type: 'resize',
                        corner,
                        startX: pos.x,
                        startY: pos.y,
                        origX: value.thumbX,
                        origY: value.thumbY,
                        origW: value.thumbW,
                        origH: value.thumbH,
                      };
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      const touch = e.touches[0];
                      const pos = getRelativePos(touch.clientX, touch.clientY);
                      dragRef.current = {
                        type: 'resize',
                        corner,
                        startX: pos.x,
                        startY: pos.y,
                        origX: value.thumbX,
                        origY: value.thumbY,
                        origW: value.thumbW,
                        origH: value.thumbH,
                      };
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        {!imgLoaded && (
          <div className="text-cocoa/50 text-sm">加载图片中...</div>
        )}
        <Image
          src={imageUrl}
          alt=""
          className="hidden"
          onLoad={handleImageLoad}
          onError={() => setImgLoaded(true)}
        />
      </div>

      {/* 参数显示 */}
      <div className="mt-2 flex items-center justify-center gap-3 text-xs text-cocoa/60 font-mono">
        <span>X: {value.thumbX}%</span>
        <span>Y: {value.thumbY}%</span>
        <span>W: {value.thumbW}%</span>
        <span>H: {value.thumbH}%</span>
      </div>
    </div>
  );
};

export default ImageCropper;
