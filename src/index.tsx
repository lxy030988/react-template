import App from "@/pages/App"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./style.css"
import "./wdyr.tsx"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './wagmi.config'

const queryClient = new QueryClient()

const container = document.getElementById("app")
if (!container) {
	throw new Error("Failed to find the root element")
}
const root = createRoot(container)

root.render(
	<WagmiProvider config={config}>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</QueryClientProvider>
	</WagmiProvider>,
)
