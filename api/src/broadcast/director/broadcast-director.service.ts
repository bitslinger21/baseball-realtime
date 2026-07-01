import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BroadcastDirectorService {
  private readonly logger = new Logger(BroadcastDirectorService.name);

  constructor() {}
}
