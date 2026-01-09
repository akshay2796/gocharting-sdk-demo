import styled from "@emotion/styled";
import type { CSSProperties, ComponentPropsWithRef } from "react";

interface TextProps extends ComponentPropsWithRef<"span"> {
	fontSize?: CSSProperties["fontSize"];
	fontWeight?: CSSProperties["fontWeight"];
	fontFamily?: CSSProperties["fontFamily"];
	lineHeight?: CSSProperties["lineHeight"];
	color?: CSSProperties["color"];
	textAlign?: CSSProperties["textAlign"];
	opacity?: CSSProperties["opacity"];
	letterSpacing?: CSSProperties["letterSpacing"];
	textTransform?: CSSProperties["textTransform"];
}

export const Text = styled.span<TextProps>`
	font-size: ${(props) => props.fontSize};
	font-weight: ${(props) => props.fontWeight};
	font-family: ${(props) => props.fontFamily};
	line-height: ${(props) => props.lineHeight};
	color: ${(props) => props.color || "white"};
	text-align: ${(props) => props.textAlign};
	opacity: ${(props) => props.opacity};
	letter-spacing: ${(props) => props.letterSpacing};
	text-transform: ${(props) => props.textTransform};
`;
