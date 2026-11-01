# Multi-stage build for Chùa Thiên Sơn TikTok Live RPC

# Stage 1: Build React Client
FROM node:20-alpine AS client-build
WORKDIR /client
COPY src/Temple.Client/package*.json ./
RUN npm install
COPY src/Temple.Client/ ./
RUN npm run build

# Stage 2: Build .NET 9 Backend
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS server-build
WORKDIR /source
COPY TempleRpc.sln ./
COPY src/Temple.Server/Temple.Server.csproj ./src/Temple.Server/
RUN dotnet restore src/Temple.Server/Temple.Server.csproj
COPY src/Temple.Server/ ./src/Temple.Server/
RUN dotnet publish src/Temple.Server/Temple.Server.csproj -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime image (.NET 9 + Node.js for TikTok Live Connector)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install Node.js for tiktok_bridge.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install npm dependencies for scripts (tiktok-live-connector)
COPY scripts/package*.json ./scripts/
RUN cd scripts && npm install --production

# Copy scripts & initial data
COPY scripts/ ./scripts/
COPY data/ ./data/

# Copy compiled backend and frontend
COPY --from=server-build /app/publish ./
COPY --from=client-build /client/dist ./dist
COPY --from=client-build /client/dist ./wwwroot

# Setup runtime environment
ENV PORT=8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "Temple.Server.dll", "--urls", "http://0.0.0.0:8080"]

