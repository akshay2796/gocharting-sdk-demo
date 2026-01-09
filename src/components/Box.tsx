import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { forwardRef } from "react";
import type { CSSProperties, ComponentPropsWithRef } from "react";

interface BoxProps extends ComponentPropsWithRef<typeof motion.div> {
	// Layout
	display?: CSSProperties["display"];
	flexDirection?: CSSProperties["flexDirection"];
	alignItems?: CSSProperties["alignItems"];
	justifyContent?: CSSProperties["justifyContent"];
	gap?: CSSProperties["gap"];
	flex?: CSSProperties["flex"];
	flexWrap?: CSSProperties["flexWrap"];
	flexShrink?: CSSProperties["flexShrink"];

	// Sizing
	width?: CSSProperties["width"];
	height?: CSSProperties["height"];
	minWidth?: CSSProperties["minWidth"];
	minHeight?: CSSProperties["minHeight"];
	maxWidth?: CSSProperties["maxWidth"];
	maxHeight?: CSSProperties["maxHeight"];

	// Spacing
	p?: string;
	px?: string;
	py?: string;
	pt?: string;
	pb?: string;
	pl?: string;
	pr?: string;
	m?: string;
	mx?: string;
	my?: string;
	mt?: string;
	mb?: string;
	ml?: string;
	mr?: string;

	// Positioning
	position?: CSSProperties["position"];
	top?: CSSProperties["top"];
	right?: CSSProperties["right"];
	bottom?: CSSProperties["bottom"];
	left?: CSSProperties["left"];
	zIndex?: CSSProperties["zIndex"];

	// Visual
	background?: CSSProperties["background"];
	backgroundColor?: CSSProperties["backgroundColor"];
	border?: CSSProperties["border"];
	borderRadius?: CSSProperties["borderRadius"];
	borderWidth?: CSSProperties["borderWidth"];
	borderStyle?: CSSProperties["borderStyle"];
	borderColor?: CSSProperties["borderColor"];
	opacity?: CSSProperties["opacity"];
	overflow?: CSSProperties["overflow"];
	overflowX?: CSSProperties["overflowX"];
	overflowY?: CSSProperties["overflowY"];
	cursor?: CSSProperties["cursor"];

	// Effects
	boxShadow?: CSSProperties["boxShadow"];
	backdropFilter?: CSSProperties["backdropFilter"];
	transform?: CSSProperties["transform"];

	// Other
	pointerEvents?: CSSProperties["pointerEvents"];
	onClickCapture?: (e: React.MouseEvent) => void;
}

const StyledBox = styled(motion.div)<BoxProps>`
	display: ${(props) => props.display || "flex"};
	flex-direction: ${(props) => props.flexDirection};
	align-items: ${(props) => props.alignItems};
	justify-content: ${(props) => props.justifyContent};
	gap: ${(props) => props.gap};
	flex: ${(props) => props.flex};
	flex-wrap: ${(props) => props.flexWrap};
	flex-shrink: ${(props) => props.flexShrink};

	width: ${(props) => props.width};
	height: ${(props) => props.height};
	min-width: ${(props) => props.minWidth};
	min-height: ${(props) => props.minHeight};
	max-width: ${(props) => props.maxWidth};
	max-height: ${(props) => props.maxHeight};

	padding: ${(props) => props.p};
	padding-left: ${(props) => props.px || props.pl};
	padding-right: ${(props) => props.px || props.pr};
	padding-top: ${(props) => props.py || props.pt};
	padding-bottom: ${(props) => props.py || props.pb};

	margin: ${(props) => props.m};
	margin-left: ${(props) => props.mx || props.ml};
	margin-right: ${(props) => props.mx || props.mr};
	margin-top: ${(props) => props.my || props.mt};
	margin-bottom: ${(props) => props.my || props.mb};

	position: ${(props) => props.position};
	top: ${(props) => props.top};
	right: ${(props) => props.right};
	bottom: ${(props) => props.bottom};
	left: ${(props) => props.left};
	z-index: ${(props) => props.zIndex};

	background: ${(props) => props.background};
	background-color: ${(props) => props.backgroundColor};
	border: ${(props) => props.border};
	border-radius: ${(props) => props.borderRadius};
	border-width: ${(props) => props.borderWidth};
	border-style: ${(props) => props.borderStyle};
	border-color: ${(props) => props.borderColor};
	opacity: ${(props) => props.opacity};
	overflow: ${(props) => props.overflow};
	overflow-x: ${(props) => props.overflowX};
	overflow-y: ${(props) => props.overflowY};
	cursor: ${(props) => props.cursor};

	box-shadow: ${(props) => props.boxShadow};
	backdrop-filter: ${(props) => props.backdropFilter};
	transform: ${(props) => props.transform};

	pointer-events: ${(props) => props.pointerEvents};
`;

export const Box = forwardRef<HTMLDivElement, BoxProps>((props, ref) => {
	return <StyledBox ref={ref} {...props} />;
});

Box.displayName = "Box";
