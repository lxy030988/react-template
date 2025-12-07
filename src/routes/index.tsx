import { lazy, Suspense } from "react"
import type { RouteObject } from "react-router-dom"
import { Loading, PageNotFoundView } from "@/components/common"
import MainLayout from "@/layouts/Layout"

const Home = lazy(() => import("@/pages/Home"))
const About = lazy(() => import("@/pages/About"))
const Demo = lazy(() => import("@/pages/Demo"))

const routes: RouteObject[] = [
	{
		path: "/",
		element: <MainLayout />,
		children: [
			{
				index: true,
				element: (
					<Suspense fallback={<Loading />}>
						<Home />
					</Suspense>
				),
			},
			{
				path: "about",
				element: (
					<Suspense fallback={<Loading />}>
						<About />
					</Suspense>
				),
			},
			{
				path: "demo",
				element: (
					<Suspense fallback={<Loading />}>
						<Demo />
					</Suspense>
				),
			},
		],
	},
	{
		path: "*",
		element: <PageNotFoundView />,
	},
]

export default routes
