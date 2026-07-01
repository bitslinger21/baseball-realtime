import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor() {}
}
