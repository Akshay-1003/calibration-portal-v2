import React from "react";
import logoUrl from "../../images/logo/logo.svg";

type BrandLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  width = 280,
  height = 50,
  priority = true,
}) => {
  return (
    <img
      className={className}
      src={logoUrl}
      width={width}
      height={height}
      alt="Logo"
      decoding="async"
      loading="eager"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
};
