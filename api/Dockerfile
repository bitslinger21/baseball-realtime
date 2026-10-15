# --------------------------------------------------
# Build stage
# --------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN corepack enable

# Copy dependency configuration
COPY package.json yarn.lock ./

RUN printf 'nodeLinker: node-modules\n' > .yarnrc.yml \
    && yarn install --immutable
        
# Copy application source
COPY . .

# Compile NestJS
RUN yarn build

# Keep only production dependencies
RUN yarn workspaces focus --production


# --------------------------------------------------
# Production stage
# --------------------------------------------------
FROM node:22-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Copy compiled application and dependencies
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json

# Run as non-root
USER node

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
