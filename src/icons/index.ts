import { createElement, type ImgHTMLAttributes } from "react";
import boxCubeUrl from "./box-cube.svg";

const BoxCubeIcon = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  createElement("img", { src: boxCubeUrl, alt: "", "aria-hidden": true, ...props })
);

export { BoxCubeIcon };
