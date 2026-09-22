import React from 'react';
import type { CollectionCard } from '@shared/api.interface';

interface ThumbImageProps {
  card: Pick<CollectionCard, 'imageUrl' | 'thumbX' | 'thumbY' | 'thumbW' | 'thumbH' | 'title'>;
  className?: string;
}

const ThumbImage: React.FC<ThumbImageProps> = ({ card, className = '' }) => {
  const hasThumb =
    card.thumbW !== undefined &&
    card.thumbW > 0 &&
    card.thumbW <= 100 &&
    card.thumbH !== undefined &&
    card.thumbH > 0 &&
    card.thumbH <= 100 &&
    card.thumbX !== undefined &&
    card.thumbY !== undefined;

  let objectPosition = '50% 50%';
  if (hasThumb) {
    const { thumbX = 0, thumbY = 0, thumbW = 100, thumbH = 100 } = card;
    const focalX = thumbX + thumbW / 2;
    const focalY = thumbY + thumbH / 2;
    objectPosition = `${focalX}% ${focalY}%`;
  }

  return (
    <img
      src={card.imageUrl}
      alt={card.title}
      className={`w-full h-full object-cover ${className}`}
      style={{ objectFit: 'cover', objectPosition }}
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23E8DDD0" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236B4F3A" font-size="10">No Image</text></svg>';
      }}
    />
  );
};

export default ThumbImage;
