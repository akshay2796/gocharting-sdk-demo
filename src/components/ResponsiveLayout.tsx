import { forwardRef, useImperativeHandle, useState } from "react";
import type { ReactNode } from "react";
import { Box } from "./Box";
import styled from "@emotion/styled";

const Main = styled.main`
	display: flex;
	flex: 1;
	min-height: 100%;
	flex-direction: column;
	align-items: center;
`;

type ResponsiveLayoutProps = {
	children: ReactNode;
	mainProps?: any;
};

export type ResponsiveLayoutHandle = {
	toggleSidebar: () => void;
	openSidebar: () => void;
	closeSidebar: () => void;
};

export const ResponsiveLayout = forwardRef<
	ResponsiveLayoutHandle,
	ResponsiveLayoutProps
>(({ children, mainProps = {} }, ref) => {
	const [, setSidebarOpen] = useState(false);

	// Extract gap from mainProps to apply it explicitly
	const { gap: mainGap, ...restMainProps } = mainProps;

	useImperativeHandle(ref, () => ({
		toggleSidebar: () => setSidebarOpen((prev) => !prev),
		openSidebar: () => setSidebarOpen(true),
		closeSidebar: () => setSidebarOpen(false),
	}));

	return (
		<Box
			backgroundColor='#0a0a0a'
			minHeight='100vh'
			width='100%'
			position='relative'
			overflowY='auto'
			overflowX='hidden'
		>
			<Main
				style={{
					gap: mainGap || "32px",
					paddingTop: "40px",
					paddingBottom: "40px",
					paddingLeft: "20px",
					paddingRight: "20px",
					...restMainProps,
				}}
			>
				{children}
			</Main>
		</Box>
	);
});

ResponsiveLayout.displayName = "ResponsiveLayout";
