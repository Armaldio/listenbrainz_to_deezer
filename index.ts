import { compareDesc, set } from "date-fns";

interface Track {
  album: string
  creator: string | Array<string>
  extension: unknown
  identifier: string
  title: string
}

interface Playlist {
  annotation: string;
  creator: string;
  date: string;
  extension: unknown;
  identifier: string;
  title: string;
  track: Array<Track>;
}

interface PlaylistFull {
  playlist: Playlist;
}

interface CreatedForPlaylistsOutput {
  count: number;
  offset: number;
  playlist_count: number;
  playlists: Array<PlaylistFull>;
}

export type ListenbrainzGetPlaylistOutput = PlaylistFull

interface DeezerCreatePlaylistsOutput {
  id: number
}

type DeezerAddTrackToPlaylistOutput = boolean

interface DeezerTrack {
  id: number
  title: string
  rank: number
  artist: {
    name: string
  }
  album: {
    title: string
  }
}

interface DeezerSearchOutput {
  data: Array<DeezerTrack>
}

interface DeezerPlaylist {
  id: number
  title: string
}

interface DeezerPlaylistsOutput {
  data: Array<DeezerPlaylist>
}

const listenbrainz_GetCreatedForPlaylists = () => {
  return fetch(
    "https://api.listenbrainz.org/1/user/Armaldio/playlists/createdfor",
    {
      headers: {
        Authorization: "Token " + process.env.LISTEN_BRAINZ_TOKEN,
      },
    }
  ).then((res) => res.json()) as Promise<CreatedForPlaylistsOutput>;
};

const listenbrainz_GetPlaylist = (playlistId: string) => {
  return fetch(
    "https://api.listenbrainz.org/1/playlist/" + playlistId,
    {
      headers: {
        Authorization: "Token " + process.env.LISTEN_BRAINZ_TOKEN,
      },
    }
  ).then((res) => res.json()) as Promise<ListenbrainzGetPlaylistOutput>;
};

const deezer_ListPlaylists = () => {
  return fetch(
    "https://api.deezer.com/user/me/playlists?access_token=" + process.env.DEEZER_ACCESS_TOKEN,
  ).then((res) => res.json()) as Promise<DeezerPlaylistsOutput>;
};

const deezer_Search = (track: Partial<Track>) => {
  const url = new URL("https://api.deezer.com/search?access_token=" + process.env.DEEZER_ACCESS_TOKEN)
  let query = ''

  if (track.title) {
    query += `track:"${track.title}" `
  }
  if (track.creator) {
    if (Array.isArray(track.creator)) {
      for (const creator of track.creator) {
        query += `artist:"${creator}" `
      }
    } else {
      query += `artist:"${track.creator}" `
    }
  }
  if (track.album) {
    query += `album:"${track.album}" `
  }
  console.log(`searching "${query}"`)
  url.searchParams.append('q', encodeURIComponent(query))
  console.log('url', url)
  return fetch(
    url.href,
  ).then((res) => res.json()) as Promise<DeezerSearchOutput>;
};

const deezer_CreatePlaylists = (title: string) => {
  return fetch(
    `https://api.deezer.com/user/me/playlists?access_token=${process.env.DEEZER_ACCESS_TOKEN}&title=${title}&request_method=POST`,
    {
      method: 'POST'
    }
  ).then((res) => res.json()) as Promise<DeezerCreatePlaylistsOutput>;
};

const deezer_DeletePlaylist = (id: number) => {
  return fetch(
    `https://api.deezer.com/playlist/${id}?request_method=DELETE&access_token=${process.env.DEEZER_ACCESS_TOKEN}`,
    {

    }
  ).then((res) => res.json()) as Promise<number>;
};

const deezer_AddTrackToPlaylist = (playlistId: string, songs: Array<number>) => {
  console.log('playlistId', playlistId)
  console.log('songs', songs.join(','), songs.length)
  return fetch(
    `https://api.deezer.com/playlist/${playlistId}/tracks?access_token=${process.env.DEEZER_ACCESS_TOKEN}&songs=${songs.join(',')}&request_method=POST`,
    {
      method: 'POST'
    }
  ).then((res) => res.json()) as Promise<DeezerAddTrackToPlaylistOutput>;
};

const deezerAuthURL = `https://connect.deezer.com/oauth/auth.php?app_id=${process.env.DEEZER_APPID}&redirect_uri=${process.env.DEEZER_REDIRECT_URL}&perms=basic_access,email,manage_library,offline_access`;
const deezerAccessTokenURL = (code: string) =>
  `https://connect.deezer.com/oauth/access_token.php?app_id=${process.env.DEEZER_APPID}&secret=${process.env.DEEZER_SECRET}&code=${code}`;

// --- Start

// checks

const variables = [
  'LISTEN_BRAINZ_TOKEN',
  'DEEZER_ACCESS_TOKEN',
  'DEEZER_PLAYLIST_NAME',
]

for (const envVar of variables) {
  if (!process.env[envVar]) {
    throw new Error('missing env var ' + envVar)
  }
}

/// Listenbrainz

const createdforPlaylists = await listenbrainz_GetCreatedForPlaylists();

const latestPlaylist = createdforPlaylists.playlists
  .filter((playlist) => {
    return playlist.playlist.title.includes("Weekly Exploration");
  })
  .sort((a, b) => compareDesc(a.playlist.date, b.playlist.date))[0];

console.log('latestPlaylist.playlist.identifier', latestPlaylist.playlist.identifier)
const playlistIdRegex = latestPlaylist.playlist.identifier.match(/playlist\/(?<id>.*)/)
const playlistId = playlistIdRegex?.groups?.id ?? ''
// console.log('playlistId', playlistId)
const fullPlaylist = await listenbrainz_GetPlaylist(playlistId)

// console.log('fullPlaylist', fullPlaylist.playlist.track)

/// Deezer

const getDeezerPlaylists = await deezer_ListPlaylists()
// console.log('getDeezerPlaylists', getDeezerPlaylists)
const foundPlaylist = getDeezerPlaylists.data.find(p => {
  return p.title === process.env.DEEZER_PLAYLIST_NAME
})
// console.log('foundPlaylist', foundPlaylist)


// delete if found
if (foundPlaylist) {
  const result = await deezer_DeletePlaylist(foundPlaylist.id)
  console.log('result', result)
}

const deezerCreatedPlaylist = await deezer_CreatePlaylists(process.env.DEEZER_PLAYLIST_NAME)
const deezerPlaylistId = deezerCreatedPlaylist.id


if (!deezerPlaylistId) {
  throw new Error('Missing playlist id')
}

// song loop
const songs: Array<number> = []
const notFoundTracks: Array<Track> = []

for (const track of fullPlaylist.playlist.track) {
  console.log('--- entering track')

  const multicreator = Array.isArray(track.creator)
    ? track.creator
    : track.creator.split(/(?:feat:?)|&/).map(x => x?.trim())

  const fallbacks = [
    () => deezer_Search({
      ...track,
      creator: multicreator
    }),
    () => deezer_Search({
      ...track,
      album: undefined
    }),
    () => deezer_Search({
      ...track,
      creator: undefined
    }),
    () => deezer_Search({
      ...track,
      album: undefined,
      creator: undefined
    })
  ]

  let found = false
  for (const fallback of fallbacks) {
    console.log('--- entering fallback')
    const foundTrack = await fallback()
    console.log('found tracks', foundTrack.data.length)

    console.log('ranks', foundTrack.data.map(x => x.rank))
    const firstElement = foundTrack.data/* .sort((a, b) => a.rank - b.rank) */[0]
    if (firstElement) {
      console.log('firstElement', {
        artist: firstElement.artist.name,
        album: firstElement.album.title,
        title: firstElement.title,
        rank: firstElement.rank,
      })
      songs.push(firstElement.id)
      found = true
      break;
    }
  }

  if (!found) {
    console.error('not found !')
    notFoundTracks.push(track)
  }

  console.log('--- exiting')
  console.log('')
}

console.log('songs', songs)
console.log('not found tracks', notFoundTracks.length)
console.log('not found tracks', notFoundTracks)

const addTracksResponse = await deezer_AddTrackToPlaylist(deezerPlaylistId.toString(), songs)

console.log('addTracksResponse', addTracksResponse)
