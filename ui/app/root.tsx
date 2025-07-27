import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import "./tailwind.css";

// Environment variables for the client
export async function loader({ request }: LoaderFunctionArgs) {
  // Log environment variables for debugging (always log for now)
  console.log('🔍 [REMIX-ENV] Root loader environment variables:', {
    'process.env.API_URL': process.env.API_URL,
    'process.env.WS_URL': process.env.WS_URL, 
    'process.env.APP_NAME': process.env.APP_NAME,
    'process.env.APP_VERSION': process.env.APP_VERSION,
    'process.env.NODE_ENV': process.env.NODE_ENV,
    'final API_URL': process.env.API_URL || 'http://localhost:3001',
    'final WS_URL': process.env.WS_URL || 'ws://localhost:3001',
    timestamp: new Date().toISOString()
  });
  
  return json({
    ENV: {
      API_URL: process.env.API_URL || 'http://localhost:3001',
      WS_URL: process.env.WS_URL || 'ws://localhost:3001',
      APP_NAME: process.env.APP_NAME || 'Baseline',
      APP_VERSION: process.env.APP_VERSION || '1.0.0',
    },
  });
}

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
          }}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
