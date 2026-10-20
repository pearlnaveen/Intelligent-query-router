import React, { useState } from 'react';

const SafeImageThumbnail = ({ src, alt = "Proof", className = "h-10 w-12 object-cover group-hover:scale-105 transition-transform" }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) return null;

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-md overflow-hidden border border-gray-200 shadow-2xs hover:border-indigo-500 transition-all cursor-pointer shrink-0"
      title="Click to view image in new tab"
    >
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className={className}
      />
    </a>
  );
};

export default SafeImageThumbnail;
