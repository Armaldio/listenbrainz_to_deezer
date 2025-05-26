# listenbrainz_to_deezer

## Setup

1. Fork & clone the repository

### Local

2. Install dependencies
```
pnpm install
```

3. Create a `.env` file
4. Fill it with the following variables:

```bash
LISTEN_BRAINZ_TOKEN=
DEEZER_ACCESS_TOKEN=
DEEZER_PLAYLIST_NAME=
LISTEN_BRAINZ_USER=
LISTEN_BRAINZ_PLAYLIST_NAME=
```

5. Run the script
```bash
pnpm run prod
```

### GitHub Actions

2. Add the following variables to your repository settings: `YOUR_REPO_URL/settings/secrets/actions` > "Repository secrets":

```bash
LISTEN_BRAINZ_TOKEN=
DEEZER_ACCESS_TOKEN=
DEEZER_PLAYLIST_NAME=
LISTEN_BRAINZ_USER=
LISTEN_BRAINZ_PLAYLIST_NAME=
```
