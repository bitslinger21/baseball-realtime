import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TeamMeta, TeamMetaIndex } from './teams-meta.types';

type EspnLogo = { href?: string };

type EspnTeam = {
  abbreviation?: string;
  name?: string;
  displayName?: string;
  color?: string; // hex WITHOUT '#', e.g. "002D62"
  alternateColor?: string; // same
  logos?: EspnLogo[];
};

type EspnTeamsResponse = {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{ team?: EspnTeam }>;
    }>;
  }>;
};

@Injectable()
export class TeamsMetaService implements OnModuleInit {
  private readonly log = new Logger(TeamsMetaService.name);

  private byAbbr: Map<string, TeamMeta> = new Map();
  private loadedAtIso: string | null = null;

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  getLoadedAtIso(): string | null {
    return this.loadedAtIso;
  }

  getIndex(): TeamMetaIndex {
    return this.byAbbr;
  }

  getByAbbr(abbr: string): TeamMeta | null {
    const key = abbr.trim().toUpperCase();
    return this.byAbbr.get(key) ?? null;
  }

  async refresh(): Promise<void> {
    const url =
      'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams';

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `TeamsMeta refresh failed: ${res.status} ${res.statusText}`,
      );
    }

    const json = (await res.json()) as EspnTeamsResponse;

    const next = new Map<string, TeamMeta>();

    const teams = json.sports?.[0]?.leagues?.[0]?.teams ?? [];

    for (const wrapper of teams) {
      const t = wrapper.team;
      if (!t) continue;

      const abbrRaw = t.abbreviation;
      if (!abbrRaw) continue;

      const abbr = abbrRaw.toUpperCase();
      const primary = normalizeHex(t.color);
      const alt = normalizeHex(t.alternateColor);

      // Prefer the first logo href if present
      const logoUrl =
        t.logos?.find((l) => typeof l.href === 'string')?.href ?? null;

      next.set(abbr, {
        abbr,
        name: t.name ?? abbr,
        displayName: t.displayName ?? t.name ?? abbr,
        primaryColorHex: primary,
        alternateColorHex: alt,
        logoUrl,
      });
    }

    this.byAbbr = next;
    this.loadedAtIso = new Date().toISOString();

    this.log.log(`Loaded team meta: ${next.size} teams`);
  }
}

function normalizeHex(v: string | undefined): string | null {
  if (!v) return null;
  const raw = v.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return `#${raw.toUpperCase()}`;
}