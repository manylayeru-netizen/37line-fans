import React from 'react';
import type { CollectionCard } from '@shared/api.interface';

interface ThumbImageProps {
  card: Pick<CollectionCard, 'imageUrl' | 'thumbX' | 'thumbY' | 'thumbW' | 'thumbH' | 'title'>;
  className?: string;
}

/**
 * 缩略图显示组件 — 根据 thumb 参数精确控制裁剪区域。
 *
 * 核心计算（正方形选框 + 正方形容器）：
 * - 外层容器：overflow: hidden，宽高比由父级控制（应为 1:1）
 * - 内层 img：width = (100 / thumbW) * 100%（相对容器宽度放大，使选框宽度等于容器宽度）
 * - transform: translate(-thumbX/thumbW * 100%, -thumbY/thumbW * 100%)
 *   位移相对 img 自身宽度的百分比，由于选框是正方形 thumbW=thumbH，两轴用同一比例
 *
 * 当 thumbW 不存在（历史数据）时，降级为 object-fit: cover + object-position: center
 */
const ThumbImage: React.FC<ThumbImageProps> = ({ card, className = '' }) => {
  const hasThumb =
    card.thumbW !== undefined &&
    card.thumbW > 0 &&
    card.thumbW <= 100 &&
    card.thumbX !== undefined &&
    card.thumbY !== undefined;

  if (!hasThumb) {
    return (
      <img
        src={card.imageUrl}
        alt={card.title}
        className={`w-full h-full object-cover object-center ${className}`}
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23E8DDD0" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236B4F3A" font-size="10">No Image</text></svg>';
        }}
      />
    );
  }

  const { thumbX = 0, thumbY = 0, thumbW = 100 } = card;
  const widthPct = (100 / thumbW) * 100;
  const translateX = -(thumbX / thumbW) * 100;
  const translateY = -(thumbY / thumbW) * 100;

  return (
    <img
      src={card.imageUrl}
      alt={card.title}
      className={`origin-top-left ${className}`}
      style={{
        width: `${widthPct}%`,
        height: 'auto',
        transform: `translate(${translateX}%, ${translateY}%)`,
      }}
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

export default ThumbImage;
