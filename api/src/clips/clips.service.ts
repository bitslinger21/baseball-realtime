import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clip, ClipPlayerTag } from '../persistence/entities/clip.entity';
import { MlbApiService } from '../providers/mlb/mlb.service';
import { ClipDto } from './dtos/clip.dto';

// "poll each live game every ~60s, poll final games a few more times for
// late clips, then stop" (PROMPT_video_clips.md §6a).
const INGEST_INTERVAL_MS = 60_000;
const FINAL_GAME_MAX_POLLS = 4;

type MlbPlayLike = {
  matchup?: { batter?: { id?: number; fullName?: string }; pitcher?: { id?: number; fullName?: string } };
  result?: { event?: string; description?: string; homeScore?: number; awayScore?: number };
  about?: { halfInning?: string; inning?: number; atBatIndex?: number; isComplete?: boolean };
};

type ContentKeyword = { type: string; value: string; displayName?: string };

type ContentHighlightItem = {
  type?: string;
  id?: string;
  slug?: string;
  title?: string;
  headline?: string;
  blurb?: string;
  description?: string | null;
  duration?: string;
  date?: string;
  keywordsAll?: ContentKeyword[];
  playbacks?: { name?: string; url?: string }[];
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseDurationSec(duration: string | undefined): number {
  if (duration == null) return 0;
  const parts = duration.split(':').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.unshift(0);
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}

// Prefer a ~720p mp4 (H.264) — the client just needs a <video> src, no HLS
// player library is in scope (§6a). Falls back to the highest-bitrate mp4.
export function pickMp4Url(playbacks: ContentHighlightItem['playbacks']): string | null {
  const mp4s = (playbacks ?? []).filter((p) => (p.url ?? '').endsWith('.mp4'));
  if (mp4s.length === 0) return null;
  const preferred = mp4s.find((p) => (p.url ?? '').includes('1280x720'));
  return (preferred ?? mp4s[mp4s.length - 1])?.url ?? null;
}

// The per-game "Game Recap" video, found by its editorial TAG, never by
// title: every recap sampled carries subject MLBCOM_GAME_RECAP (plus
// taxonomy "game-recap" / mlbtax "mlb_recap"), and the condensed game is
// tagged separately (MLBCOM_CONDENSED_GAME), so the two can't be confused
// (PROMPT_postseason_bracket.md §5, confirmed against 2025 postseason feeds).
export function findGameRecap(
  content: unknown,
): { id: string; url: string; durationSec: number } | null {
  const c = content as { highlights?: { highlights?: { items?: ContentHighlightItem[] } } } | null;
  const items = c?.highlights?.highlights?.items ?? [];
  const recap = items.find(
    (i) =>
      i.type === 'video' &&
      i.id != null &&
      (i.keywordsAll ?? []).some((k) => k.type === 'subject' && k.value === 'MLBCOM_GAME_RECAP'),
  );
  if (recap?.id == null) return null;
  const url = pickMp4Url(recap.playbacks);
  if (url == null) return null;
  return { id: recap.id, url, durationSec: parseDurationSec(recap.duration) };
}

// Slug fragments the source's event-outcome naming maps to, keyed by the
// feed's own result.event string — a tie-breaker signal alongside the
// batter/pitcher name match (see matchClipToPlay). Deliberately excludes
// hit/out types (Single/Double/Groundout/…): the source's pitch-level
// description ("in play, run(s)") is shared by almost every ball in play
// regardless of what it turns into, so it doesn't discriminate between a
// batter's own different at-bats — only the genuinely distinctive outcomes
// (a strikeout's/walk's/home run's own wording) are worth the extra point.
const EVENT_SLUG_HINTS: Record<string, string[]> = {
  Strikeout: ['strikes-out', 'strikeout'],
  Walk: ['walks'],
  HomeRun: ['homers', 'home-run'],
};

@Injectable()
export class ClipsService {
  private readonly log = new Logger(ClipsService.name);
  private readonly lastIngestAt = new Map<string, number>();
  private readonly finalPollCount = new Map<string, number>();

  constructor(
    @InjectRepository(Clip) private readonly repo: Repository<Clip>,
    private readonly mlb: MlbApiService,
  ) {}

  /**
   * Self-throttling — safe to call on every poller tick for every game.
   * Scheduled games are skipped entirely; final games stop being polled
   * after a bounded number of extra passes (late clips still land a few
   * minutes after the last out).
   */
  async maybeIngest(gameId: string, status: 'live' | 'final' | 'scheduled'): Promise<void> {
    if (status === 'scheduled') return;
    if (status === 'final') {
      const count = this.finalPollCount.get(gameId) ?? 0;
      if (count >= FINAL_GAME_MAX_POLLS) return;
      this.finalPollCount.set(gameId, count + 1);
    }
    const last = this.lastIngestAt.get(gameId) ?? 0;
    if (Date.now() - last < INGEST_INTERVAL_MS) return;
    this.lastIngestAt.set(gameId, Date.now());
    await this.ingestForGame(gameId);
  }

  async ingestForGame(gameId: string): Promise<void> {
    try {
      const [content, feed] = await Promise.all([
        this.mlb.getGameContent(gameId),
        this.mlb.getLiveFeed(gameId),
      ]);
      if (content == null) return;
      const items = this.extractVideoItems(content);
      if (items.length === 0) return;
      const allPlays: MlbPlayLike[] = feed.liveData?.plays?.allPlays ?? [];
      for (const item of items) {
        await this.upsertClip(gameId, item, allPlays);
      }
    } catch (e: unknown) {
      this.log.warn(
        `clip ingest failed for ${gameId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private extractVideoItems(content: unknown): ContentHighlightItem[] {
    const c = content as {
      highlights?: { highlights?: { items?: ContentHighlightItem[] } };
    };
    const items = c.highlights?.highlights?.items ?? [];
    return items.filter((i) => i.type === 'video' && i.id != null);
  }

  private async upsertClip(
    gameId: string,
    item: ContentHighlightItem,
    allPlays: readonly MlbPlayLike[],
  ): Promise<void> {
    if (item.id == null) return;
    const mp4Url = pickMp4Url(item.playbacks);
    if (mp4Url == null) return; // nothing playable — skip entirely, not a placeholder row

    const taggedIds = (item.keywordsAll ?? [])
      .filter((k) => k.type === 'player_id')
      .map((k) => Number(k.value))
      .filter((n) => Number.isFinite(n));
    const teamKw = (item.keywordsAll ?? []).find((k) => k.type === 'team_id');
    const fallbackTeamId = teamKw != null ? Number(teamKw.value) : 0;

    const match = this.matchClipToPlay(item.slug, taggedIds, allPlays);
    if (match == null) {
      this.log.warn(`clip unmatched to a play: ${item.id} (${item.slug ?? item.title ?? ''})`);
    }

    const players: ClipPlayerTag[] = taggedIds.map((id) => {
      let role = 'fielder';
      if (match?.matchup?.batter?.id === id) role = 'batter';
      else if (match?.matchup?.pitcher?.id === id) role = 'pitcher';
      return { id, teamId: fallbackTeamId, role };
    });

    const clip = new Clip();
    clip.id = item.id;
    clip.gameId = gameId;
    clip.atBatIndex = match?.about?.atBatIndex ?? null;
    clip.inning = match?.about?.inning ?? null;
    clip.half = match?.about?.halfInning === 'top' ? 'top' : match?.about?.halfInning === 'bottom' ? 'bottom' : null;
    clip.title = item.title ?? item.headline ?? '';
    // Drop blurb when it equals title (every sample so far) — nothing to keep.
    clip.description = item.description ?? '';
    clip.durationSec = parseDurationSec(item.duration);
    clip.mp4Url = mp4Url;
    clip.thumbnailUrl = null;
    clip.players = players;
    clip.scoreAfter =
      match?.result?.awayScore != null && match?.result?.homeScore != null
        ? { away: match.result.awayScore, home: match.result.homeScore }
        : null;
    clip.publishedAt = item.date != null ? new Date(item.date) : new Date();

    await this.repo.save(clip); // upsert on the source's own id (primary key)
  }

  // Matches on the source's own slug (built from the pitcher/batter names and
  // the play's outcome — "aaron-civale-in-play-run-s-to-connor-wong") against
  // the game's real plays, scoped to plays involving one of the clip's
  // tagged players. No shared id exists between the content feed and the
  // play-by-play feed (confirmed against real data), so this is a
  // best-effort heuristic — ties or weak matches are left unmatched rather
  // than guessed (§6a).
  private matchClipToPlay(
    slugRaw: string | undefined,
    taggedPlayerIds: readonly number[],
    allPlays: readonly MlbPlayLike[],
  ): MlbPlayLike | null {
    const slug = (slugRaw ?? '').toLowerCase();
    if (slug === '' || taggedPlayerIds.length === 0) return null;
    const idSet = new Set(taggedPlayerIds);

    const candidates = allPlays.filter(
      (p) =>
        (p.matchup?.batter?.id != null && idSet.has(p.matchup.batter.id)) ||
        (p.matchup?.pitcher?.id != null && idSet.has(p.matchup.pitcher.id)),
    );
    if (candidates.length === 0) return null;

    let best: MlbPlayLike | null = null;
    let bestScore = 0;
    let tied = false;
    for (const p of candidates) {
      let score = 0;
      const batterSlug = p.matchup?.batter?.fullName != null ? slugify(p.matchup.batter.fullName) : '';
      const pitcherSlug = p.matchup?.pitcher?.fullName != null ? slugify(p.matchup.pitcher.fullName) : '';
      if (batterSlug !== '' && slug.includes(batterSlug)) score += 2;
      if (pitcherSlug !== '' && slug.includes(pitcherSlug)) score += 2;
      const hints = EVENT_SLUG_HINTS[p.result?.event ?? ''] ?? [];
      if (hints.some((h) => slug.includes(h))) score += 1;

      if (score > bestScore) {
        best = p;
        bestScore = score;
        tied = false;
      } else if (score === bestScore && score > 0) {
        tied = true;
      }
    }
    if (best == null || bestScore < 2 || tied) return null;
    return best;
  }

  async getClipsForGame(gameId: string): Promise<ClipDto[]> {
    const rows = await this.repo.find({ where: { gameId } });
    return this.orderByPlay(rows).map(toDto);
  }

  // `{ [entityKey]: Clip[] }`, keyed "player:<id>" / "team:<id>" — a clip
  // appears under EVERY matching key, player and team both (§6c, intended).
  async getClipsForFollowing(
    playerIds: readonly number[],
    teamIds: readonly number[],
  ): Promise<Record<string, ClipDto[]>> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const rows = await this.repo
      .createQueryBuilder('c')
      .where('c.publishedAt >= :start', { start: todayStart })
      .getMany();
    const ordered = this.orderByPlay(rows);

    const result: Record<string, ClipDto[]> = {};
    for (const id of playerIds) {
      result[`player:${id}`] = ordered.filter((c) => c.players.some((p) => p.id === id)).map(toDto);
    }
    for (const id of teamIds) {
      result[`team:${id}`] = ordered.filter((c) => c.players.some((p) => p.teamId === id)).map(toDto);
    }
    return result;
  }

  // Game order: inning, then at-bat index. Unmatched clips (no play) sort
  // last — they still show in the Highlights row, just with nothing to
  // order them against.
  private orderByPlay(rows: readonly Clip[]): Clip[] {
    return [...rows].sort((a, b) => {
      if (a.atBatIndex == null && b.atBatIndex == null) return 0;
      if (a.atBatIndex == null) return 1;
      if (b.atBatIndex == null) return -1;
      return a.atBatIndex - b.atBatIndex;
    });
  }
}

function toDto(c: Clip): ClipDto {
  return {
    id: c.id,
    gameId: c.gameId,
    atBatIndex: c.atBatIndex,
    inning: c.inning,
    half: c.half,
    title: c.title,
    description: c.description,
    durationSec: c.durationSec,
    mp4Url: c.mp4Url,
    thumbnailUrl: c.thumbnailUrl,
    players: c.players,
    scoreAfter: c.scoreAfter,
    publishedAt: c.publishedAt.toISOString(),
  };
}
