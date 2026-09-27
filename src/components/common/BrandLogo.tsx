import React from "react";

type BrandLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  width = 280,
  height = 50,
  priority = true,
}) => {
  const src = "/images/logo/logo.svg";

  return (
    <img
      className={className}
      src={src}
      width={width}
      height={height}
      alt="Logo"
      decoding="async"
      loading="eager"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
};
