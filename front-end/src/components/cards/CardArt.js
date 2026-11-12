import { useState } from 'react';

const FALLBACK_LABEL = 'Sem imagem';

function CardArt({ src, alt, className = '' }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`card-placeholder ${className}`.trim()}>
        <span>{FALLBACK_LABEL}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export default CardArt;