import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NarratorService {
  private readonly logger = new Logger(NarratorService.name);

  constructor() {}
}
