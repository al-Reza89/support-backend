# Documentation Authentication

## Overview

This module handles user authentication using NestJS. It provides routes for user signup, signin, logout, and token refreshing.

## Run locally backend

```
npm install
npm run start:dev
```

## Run with docker in dev

```
docker compose -f docker-compose.backend.dev.yml up -d
```

## list of docker container and stop it

```
docker ps -a
docker stop image_or_container_name
```

or

```
docker compose -f docker-compose.backend.dev.yml down
```

## To see docker logs

```
docker logs -f <container-id-or-name>
or
docker logs <container-id-or-name>

```

## AuthController

## localhost:3000

### 1. Signup Local User

- **Route:** `/api/auth/signup`
- **Method:** `POST`
- **Description:** Create a new local user.
- **HTTP Code:** 201 (Created)

## Signin Local User

- **Route:** `/api/auth/signin`
- **Method:** `POST`
- **Description:** Authenticate a local user.
- **HTTP Code:** 201 (Created)

## Logout User

- **Route:** `/api/auth/logout`
- **Method:** `POST`
- **Description:** Logout a user.
- **HTTP Code:** 201 (OK)

## Refresh Access Token

- **Route**: `api/auth/refresh`
- **Method**: POST
- **Description**: Refresh the access token using a refresh token.
- **HTTP Code**: 200 (OK)

  ## Decorators and Guards

**@Public()**: Marks a route as public, requiring no authentication.

**@GetCurrentUserId()**: Decorator to get the current user's ID.

**@GetCurrentUser('refreshToken')**: Decorator to get the current user's refresh token.

**@UseGuards(RtGuard)**: Guard to validate the refresh token.
