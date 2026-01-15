# Hypercerts SDK Implementation Guide

This guide covers setting up the `@hypercerts-org/sdk` (core) and `@hypercerts-org/sdk-react` packages in a Next.js
application.

## Table of Contents

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [OAuth Configuration](#oauth-configuration)
- [Next.js Setup](#nextjs-setup)
- [Using Hooks](#using-hooks)
- [Server-Side Rendering](#server-side-rendering)
- [API Routes](#api-routes)
- [Complete Example](#complete-example)

## Installation

```bash
npm install @hypercerts-org/sdk @hypercerts-org/sdk-react @tanstack/react-query
```

## Prerequisites

Before using the SDK, you need:

1. **OAuth Client Metadata** - A publicly accessible JSON file describing your OAuth client
2. **JWKS Endpoint** - A JSON Web Key Set for signing OAuth requests
3. **Private JWK** - The private key corresponding to your JWKS (keep this secret)

### OAuth Client Metadata

Host a `client-metadata.json` file at a public URL (e.g., `https://your-app.com/client-metadata.json`):

```json
{
  "client_id": "https://your-app.com/client-metadata.json",
  "client_name": "Your App Name",
  "client_uri": "https://your-app.com",
  "redirect_uris": ["https://your-app.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "token_endpoint_auth_method": "private_key_jwt",
  "token_endpoint_auth_signing_alg": "ES256",
  "jwks_uri": "https://your-app.com/.well-known/jwks.json"
}
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_OAUTH_CLIENT_ID=https://your-app.com/client-metadata.json
NEXT_PUBLIC_OAUTH_REDIRECT_URI=https://your-app.com/callback
NEXT_PUBLIC_PDS_URL=https://bsky.social
NEXT_PUBLIC_SDS_URL=https://sds.hypercerts.org
JWK_PRIVATE_KEY={"kty":"EC","crv":"P-256",...}
```

## OAuth Configuration

Create a configuration file for your SDK setup:

```typescript
// lib/atproto.ts
import { createATProtoReact } from "@hypercerts-org/sdk-react";
import { QueryClient } from "@tanstack/react-query";

// Create a shared QueryClient (can be shared with wagmi, tRPC, etc.)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Create the ATProto React instance
export const atproto = createATProtoReact({
  queryClient,
  config: {
    oauth: {
      clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!,
      redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!,
      scope: "atproto transition:generic",
    },
    servers: {
      pds: process.env.NEXT_PUBLIC_PDS_URL || "https://bsky.social",
      sds: process.env.NEXT_PUBLIC_SDS_URL,
    },
  },
});

// Export hooks for convenience
export const {
  Provider: ATProtoProvider,
  useAuth,
  useProfile,
  useOrganizations,
  useOrganization,
  useProjects,
  useProject,
  useCollaborators,
  useHypercerts,
  useHypercert,
  useRepository,
} = atproto;
```

## Next.js Setup

### App Router (Next.js 13+)

Create a providers component:

```typescript
// app/providers.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient, ATProtoProvider } from "@/lib/atproto";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ATProtoProvider>{children}</ATProtoProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Wrap your app in the root layout:

```typescript
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Pages Router (Next.js 12 and earlier)

```typescript
// pages/_app.tsx
import type { AppProps } from "next/app";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, ATProtoProvider } from "@/lib/atproto";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ATProtoProvider>
        <Component {...pageProps} />
      </ATProtoProvider>
    </QueryClientProvider>
  );
}
```

## Using Hooks

### Authentication

```typescript
// components/AuthButton.tsx
"use client";

import { useAuth } from "@/lib/atproto";

export function AuthButton() {
  const { status, session, login, logout, error } = useAuth();

  if (status === "loading") {
    return <button disabled>Loading...</button>;
  }

  if (status === "authenticated") {
    return (
      <div>
        <span>Signed in as {session?.handle}</span>
        <button onClick={() => logout()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => login("bsky.social")}>Sign in with Bluesky</button>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

### Profile Management

```typescript
// components/Profile.tsx
"use client";

import { useProfile } from "@/lib/atproto";

export function Profile() {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();

  if (isLoading) return <div>Loading profile...</div>;
  if (!profile) return <div>Not authenticated</div>;

  const handleUpdateBio = async () => {
    await updateProfile({ description: "Updated bio!" });
  };

  return (
    <div>
      <h2>{profile.displayName}</h2>
      <p>{profile.description}</p>
      <button onClick={handleUpdateBio} disabled={isUpdating}>
        {isUpdating ? "Updating..." : "Update Bio"}
      </button>
    </div>
  );
}
```

### Working with Hypercerts

```typescript
// components/HypercertList.tsx
"use client";

import { useHypercerts } from "@/lib/atproto";

export function HypercertList() {
  const { hypercerts, isLoading, create, isCreating, error } = useHypercerts();

  const handleCreate = async () => {
    const result = await create({
      title: "Community Garden Impact",
      description: "Established a community garden serving 50 families",
      workScope: "Urban Agriculture",
      workTimeframeFrom: "2024-01-01",
      workTimeframeTo: "2024-12-31",
      rights: {
        name: "CC-BY-4.0",
        type: "license",
        description: "Creative Commons Attribution 4.0",
      },
    });
    console.log("Created hypercert:", result.hypercertUri);
  };

  if (isLoading) return <div>Loading hypercerts...</div>;

  return (
    <div>
      <button onClick={handleCreate} disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Hypercert"}
      </button>

      {error && <p className="error">{error.message}</p>}

      <ul>
        {hypercerts?.map((cert) => (
          <li key={cert.uri}>
            <h3>{cert.value.title}</h3>
            <p>{cert.value.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Single Hypercert

```typescript
// components/HypercertDetail.tsx
"use client";

import { useHypercert } from "@/lib/atproto";

export function HypercertDetail({ uri }: { uri: string }) {
  const { hypercert, isLoading, update, remove, isUpdating, isDeleting } = useHypercert(uri);

  if (isLoading) return <div>Loading...</div>;
  if (!hypercert) return <div>Hypercert not found</div>;

  return (
    <div>
      <h1>{hypercert.value.title}</h1>
      <p>{hypercert.value.description}</p>

      <button onClick={() => update({ title: "Updated Title" })} disabled={isUpdating}>
        Update
      </button>

      <button onClick={() => remove()} disabled={isDeleting}>
        Delete
      </button>
    </div>
  );
}
```

### Organizations

```typescript
// components/Organizations.tsx
"use client";

import { useOrganizations } from "@/lib/atproto";

export function Organizations() {
  const { organizations, isLoading, create, isCreating } = useOrganizations();

  const handleCreate = async () => {
    await create({
      name: "Impact Collective",
      description: "A collective focused on environmental impact",
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate} disabled={isCreating}>
        Create Organization
      </button>

      <ul>
        {organizations?.map((org) => (
          <li key={org.did}>
            <h3>{org.name}</h3>
            <p>{org.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Projects

```typescript
// components/Projects.tsx
"use client";

import { useProjects } from "@/lib/atproto";

export function Projects() {
  const { projects, isLoading, create, isCreating } = useProjects();

  const handleCreate = async () => {
    await create({
      title: "Clean Water Initiative",
      shortDescription: "Providing clean water access to rural communities",
      description: { /* Leaflet linear document */ },
      activities: [
        { uri: "at://did:plc:xyz/org.hypercerts.claim/abc", cid: "bafyreiabc", weight: "60" },
        { uri: "at://did:plc:xyz/org.hypercerts.claim/def", cid: "bafyreidef", weight: "40" },
      ],
      location: { uri: "at://did:plc:xyz/app.certified.location/loc1", cid: "bafyreiloc" },
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleCreate} disabled={isCreating}>
        Create Project
      </button>

      <ul>
        {projects?.map((project) => (
          <li key={project.uri}>
            <h3>{project.title}</h3>
            <p>{project.shortDescription}</p>
            {project.activities && (
              <small>{project.activities.length} activities</small>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Single Project

```typescript
// components/ProjectDetail.tsx
"use client";

import { useProject } from "@/lib/atproto";

export function ProjectDetail({ uri }: { uri: string }) {
  const { project, isLoading, update, remove, isUpdating, isDeleting } = useProject(uri);

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  const handleAddAvatar = async () => {
    const avatarBlob = new Blob([/* image data */], { type: "image/png" });
    await update({ avatar: avatarBlob });
  };

  return (
    <div>
      <h1>{project.title}</h1>
      <p>{project.shortDescription}</p>

      {project.avatar && (
        <img src={/* blob URL */} alt="Project avatar" />
      )}

      <button onClick={handleAddAvatar} disabled={isUpdating}>
        Add Avatar
      </button>

      <button
        onClick={() => update({ title: "Updated Title" })}
        disabled={isUpdating}
      >
        Update
      </button>

      <button onClick={() => remove()} disabled={isDeleting}>
        Delete
      </button>
    </div>
  );
}
```

### Collaborators

```typescript
// components/Collaborators.tsx
"use client";

import { useCollaborators } from "@/lib/atproto";

export function Collaborators() {
  const { collaborators, isLoading, grant, revoke } = useCollaborators();

  const handleGrant = async () => {
    await grant({
      did: "did:plc:example123",
      role: "contributor",
      permissions: {
        canCreate: true,
        canUpdate: false,
        canDelete: false,
      },
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={handleGrant}>Add Collaborator</button>

      <ul>
        {collaborators?.map((collab) => (
          <li key={collab.did}>
            <span>{collab.did}</span>
            <span>{collab.role}</span>
            <button onClick={() => revoke(collab.did)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Server-Side Rendering

For SSR with hydration, use the SSR helpers:

```typescript
// lib/atproto.ts (add to existing file)
import { createSSRHelpers } from "@hypercerts-org/sdk-react";

export const ssrHelpers = createSSRHelpers(atproto);
```

### App Router SSR

```typescript
// app/hypercerts/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ssrHelpers, queryClient } from "@/lib/atproto";
import { HypercertList } from "@/components/HypercertList";

export default async function HypercertsPage() {
  // Prefetch data on the server
  await ssrHelpers.prefetchHypercerts(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HypercertList />
    </HydrationBoundary>
  );
}
```

### Pages Router SSR

```typescript
// pages/hypercerts.tsx
import { dehydrate } from "@tanstack/react-query";
import { ssrHelpers, queryClient } from "@/lib/atproto";
import { HypercertList } from "@/components/HypercertList";

export async function getServerSideProps() {
  await ssrHelpers.prefetchHypercerts(queryClient);

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
  };
}

export default function HypercertsPage() {
  return <HypercertList />;
}
```

## API Routes

### OAuth Callback Handler

For the OAuth callback, create an API route:

```typescript
// app/callback/route.ts (App Router)
import { NextRequest, NextResponse } from "next/server";
import { ATProtoSDK } from "@hypercerts-org/sdk";

const sdk = new ATProtoSDK({
  oauth: {
    clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!,
    redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!,
    scope: "atproto transition:generic",
    jwksUri: `${process.env.NEXT_PUBLIC_APP_URL}/.well-known/jwks.json`,
    jwkPrivate: process.env.JWK_PRIVATE_KEY!,
  },
  servers: {
    pds: process.env.NEXT_PUBLIC_PDS_URL || "https://bsky.social",
    sds: process.env.NEXT_PUBLIC_SDS_URL,
  },
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_params", request.url));
  }

  try {
    const session = await sdk.callback({ code, state });

    // Store session in a secure cookie or return to client
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("session", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
```

### Pages Router API Route

```typescript
// pages/api/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ATProtoSDK } from "@hypercerts-org/sdk";

const sdk = new ATProtoSDK({
  // ... same config as above
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect("/?error=missing_params");
  }

  try {
    const session = await sdk.callback({
      code: String(code),
      state: String(state),
    });

    // Set session cookie
    res.setHeader(
      "Set-Cookie",
      `session=${JSON.stringify(session)}; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    );

    return res.redirect("/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.redirect("/?error=auth_failed");
  }
}
```

## Complete Example

Here's a complete example putting it all together:

```typescript
// lib/atproto.ts
import { createATProtoReact } from "@hypercerts-org/sdk-react";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export const atproto = createATProtoReact({
  queryClient,
  config: {
    oauth: {
      clientId: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID!,
      redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI!,
      scope: "atproto transition:generic",
    },
    servers: {
      pds: process.env.NEXT_PUBLIC_PDS_URL || "https://bsky.social",
      sds: process.env.NEXT_PUBLIC_SDS_URL,
    },
  },
});

export const {
  Provider: ATProtoProvider,
  useAuth,
  useProfile,
  useOrganizations,
  useProjects,
  useProject,
  useHypercerts,
  useHypercert,
  useCollaborators,
} = atproto;
```

```typescript
// app/providers.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, ATProtoProvider } from "@/lib/atproto";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ATProtoProvider>{children}</ATProtoProvider>
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

```typescript
// app/page.tsx
"use client";

import { useAuth, useHypercerts } from "@/lib/atproto";

export default function Home() {
  const { status, session, login, logout } = useAuth();
  const { hypercerts, isLoading, create } = useHypercerts();

  return (
    <main>
      <h1>Hypercerts App</h1>

      {status === "authenticated" ? (
        <div>
          <p>Welcome, {session?.handle}!</p>
          <button onClick={() => logout()}>Sign Out</button>

          <h2>Your Hypercerts</h2>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <ul>
              {hypercerts?.map((cert) => (
                <li key={cert.uri}>{cert.value.title}</li>
              ))}
            </ul>
          )}

          <button
            onClick={() =>
              create({
                title: "New Impact",
                description: "Description of impact",
                workScope: "Category",
                workTimeframeFrom: "2024-01-01",
                workTimeframeTo: "2024-12-31",
                rights: {
                  name: "CC-BY-4.0",
                  type: "license",
                  description: "Attribution license",
                },
              })
            }
          >
            Create Hypercert
          </button>
        </div>
      ) : (
        <button onClick={() => login("bsky.social")}>Sign in with Bluesky</button>
      )}
    </main>
  );
}
```

## Integration with Other Libraries

### With Wagmi (Ethereum)

```typescript
import { createATProtoReact } from "@hypercerts-org/sdk-react";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

// Share QueryClient between wagmi and atproto
const queryClient = new QueryClient();

const atproto = createATProtoReact({
  queryClient, // Same instance used by wagmi
  config: {
    /* ... */
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <atproto.Provider>
          <MyApp />
        </atproto.Provider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
```

### With tRPC

```typescript
import { createATProtoReact } from "@hypercerts-org/sdk-react";
import { trpc } from "./trpc";

// Share QueryClient
const queryClient = new QueryClient();

const atproto = createATProtoReact({
  queryClient,
  config: {
    /* ... */
  },
});

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <atproto.Provider>
          <MyApp />
        </atproto.Provider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

## Error Handling

The SDK exports typed errors for better error handling:

```typescript
import {
  AuthenticationError,
  SessionExpiredError,
  ValidationError,
  NetworkError,
  SDSRequiredError,
} from "@hypercerts-org/sdk";

try {
  await create({
    /* ... */
  });
} catch (error) {
  if (error instanceof SessionExpiredError) {
    // Redirect to login
    login();
  } else if (error instanceof ValidationError) {
    // Show validation message
    console.error("Invalid data:", error.message);
  } else if (error instanceof NetworkError) {
    // Retry or show network error
    console.error("Network issue:", error.message);
  } else if (error instanceof SDSRequiredError) {
    // SDS URL not configured
    console.error("SDS not configured");
  }
}
```

## Testing

For testing components that use the SDK hooks:

```typescript
import { render, screen } from "@testing-library/react";
import { TestProvider, createMockSession } from "@hypercerts-org/sdk-react/testing";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders authenticated state", () => {
    const mockSession = createMockSession();

    render(
      <TestProvider initialSession={mockSession}>
        <MyComponent />
      </TestProvider>,
    );

    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });
});
```

## Query Keys

For manual cache management, use the exported query keys:

```typescript
import { atprotoKeys, queryClient } from "@/lib/atproto";

// Invalidate all hypercerts
queryClient.invalidateQueries({ queryKey: atprotoKeys.hypercerts.all });

// Invalidate specific hypercert
queryClient.invalidateQueries({
  queryKey: atprotoKeys.hypercerts.detail("at://did:plc:.../..."),
});

// Invalidate profile
queryClient.invalidateQueries({ queryKey: atprotoKeys.profile });
```

## Cross-Tab Synchronization

The SDK supports cross-tab session synchronization:

```typescript
import { useSessionSync } from "@hypercerts-org/sdk-react";

function App() {
  // Automatically sync session changes across browser tabs
  useSessionSync();

  return <MyApp />;
}
```
